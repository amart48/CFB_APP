import { clockToSeconds } from "../../utils/time";
import type { TeamGameStats } from "../models";
import type { RawAdvancedGameStats, RawGameTeams } from "../schemas";

type StatMap = Map<string, string>;

/** Stats are STRINGS keyed by category name. Never read by array position. */
export function statMap(
  stats: { category: string; stat?: string | null }[],
): StatMap {
  return new Map(stats.map((s) => [s.category, s.stat ?? ""]));
}

export function statInt(map: StatMap, category: string): number {
  const n = Number.parseInt(map.get(category) ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

/** "6-9" to made/attempts. Zeros for missing or malformed input. */
export function parseMadeAtt(value: string | undefined): {
  made: number;
  att: number;
} {
  const m = /^(\d+)-(\d+)$/.exec(value ?? "");
  return m ? { made: Number(m[1]), att: Number(m[2]) } : { made: 0, att: 0 };
}

/** Third-down percent, guarding zero attempts. Null when there were no attempts. */
export function thirdDownPercent(td: {
  made: number;
  att: number;
}): number | null {
  return td.att === 0 ? null : (td.made / td.att) * 100;
}

export type StatsJoinResult = {
  stats: TeamGameStats[];
  /** Team rows with no matching advanced-stats row (join is by gameId + team name). */
  unmatched: { gameId: number; team: string }[];
};

export function normalizeTeamGameStats(
  gameTeams: RawGameTeams[],
  advanced: RawAdvancedGameStats[],
): StatsJoinResult {
  const adv = new Map(
    advanced.map((a) => [`${a.gameId}|${a.team}`, a.offense]),
  );
  const stats: TeamGameStats[] = [];
  const unmatched: StatsJoinResult["unmatched"] = [];

  for (const game of gameTeams) {
    for (const t of game.teams) {
      const m = statMap(t.stats);
      const offense = adv.get(`${game.id}|${t.team}`);
      if (!offense) unmatched.push({ gameId: game.id, team: t.team });

      const totalYards = statInt(m, "totalYards");
      // One consistent source for plays: the advanced endpoint.
      const plays = offense?.plays ?? null;
      stats.push({
        gameId: game.id,
        teamId: t.teamId,
        totalYards,
        rushYards: statInt(m, "rushingYards"),
        passYards: statInt(m, "netPassingYards"),
        turnovers: statInt(m, "turnovers"),
        thirdDown: parseMadeAtt(m.get("thirdDownEff")),
        possessionSeconds: clockToSeconds(m.get("possessionTime")),
        plays,
        yardsPerPlay: plays ? totalYards / plays : null,
        successRate: offense?.successRate ?? null,
        ppa: offense?.ppa ?? null,
        explosiveness: offense?.explosiveness ?? null,
      });
    }
  }
  return { stats, unmatched };
}

/**
 * A `/stats/game/advanced` team slice returns only the slice team's row, but the opponent's
 * offense is exactly this row's `defense` block (verified against the real opponent row). Add the
 * mirrored row so the existing gameId + team name join covers both sides from one call.
 */
export function withOpponentRows(
  rows: RawAdvancedGameStats[],
): RawAdvancedGameStats[] {
  const have = new Set(rows.map((r) => `${r.gameId}|${r.team}`));
  const mirrored = rows
    .filter((r) => !have.has(`${r.gameId}|${r.opponent}`))
    .map((r) => ({
      gameId: r.gameId,
      team: r.opponent,
      opponent: r.team,
      offense: r.defense,
      defense: r.offense,
    }));
  return [...rows, ...mirrored];
}
