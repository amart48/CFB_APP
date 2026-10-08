import type { SideStats, Team, TeamSeasonRow } from "../models";
import type {
  RawGame,
  RawRecord,
  RawSeasonAdvanced,
  RawSeasonStat,
  RawSpRating,
} from "../schemas";

export type TeamSeasonSources = {
  teams: Team[];
  sp: RawSpRating[];
  advanced: RawSeasonAdvanced[];
  seasonStats: RawSeasonStat[];
  records: RawRecord[];
  games: RawGame[];
};

export type TeamSeasonResult = {
  rows: TeamSeasonRow[];
  /** Teams missing from a name-keyed source, so a future name mismatch is visible. */
  unmatched: { source: "sp" | "advanced" | "seasonStats"; team: string }[];
};

const divide = (
  n: number | null | undefined,
  d: number | null | undefined,
): number | null => (n == null || !d ? null : n / d);

/** Completed-game points for/against per team id. */
function pointTotals(games: RawGame[]) {
  const totals = new Map<number, { games: number; pf: number; pa: number }>();
  const add = (id: number, pf: number, pa: number) => {
    const t = totals.get(id) ?? { games: 0, pf: 0, pa: 0 };
    t.games += 1;
    t.pf += pf;
    t.pa += pa;
    totals.set(id, t);
  };
  for (const g of games) {
    if (!g.completed || g.homePoints == null || g.awayPoints == null) continue;
    add(g.homeId, g.homePoints, g.awayPoints);
    add(g.awayId, g.awayPoints, g.homePoints);
  }
  return totals;
}

/**
 * Joins the six season sources into table rows. SP+, advanced and season stats join by
 * team name (verified identical to /teams/fbs school); records and games join by team id.
 */
export function buildTeamSeasonRows(src: TeamSeasonSources): TeamSeasonResult {
  // The SP+ response has a stray "nationalAverages" row with no conference.
  const sp = new Map(
    src.sp.filter((r) => r.conference).map((r) => [r.team, r]),
  );
  const adv = new Map(src.advanced.map((r) => [r.team, r]));
  const stat = new Map<string, Map<string, number>>();
  for (const s of src.seasonStats) {
    const m = stat.get(s.team) ?? new Map<string, number>();
    m.set(s.statName, s.statValue);
    stat.set(s.team, m);
  }
  const records = new Map(src.records.map((r) => [r.teamId, r]));
  const points = pointTotals(src.games);

  const unmatched: TeamSeasonResult["unmatched"] = [];
  const rows = src.teams.map((team): TeamSeasonRow => {
    const rating = sp.get(team.school);
    const advanced = adv.get(team.school);
    const stats = stat.get(team.school);
    if (!rating) unmatched.push({ source: "sp", team: team.school });
    if (!advanced) unmatched.push({ source: "advanced", team: team.school });
    if (!stats) unmatched.push({ source: "seasonStats", team: team.school });

    const rec = records.get(team.id);
    const pts = points.get(team.id);
    const side = (kind: "offense" | "defense"): SideStats => {
      const a = advanced?.[kind];
      const yards = stats?.get(
        kind === "offense" ? "totalYards" : "totalYardsOpponent",
      );
      return {
        ppa: a?.ppa ?? null,
        successRate: a?.successRate ?? null,
        explosiveness: a?.explosiveness ?? null,
        yardsPerPlay: divide(yards, a?.plays),
        pointsPerGame: divide(
          kind === "offense" ? pts?.pf : pts?.pa,
          pts?.games,
        ),
      };
    };
    return {
      team,
      record: rec
        ? {
            wins: rec.total.wins ?? 0,
            losses: rec.total.losses ?? 0,
            ties: rec.total.ties ?? 0,
          }
        : null,
      spOverall: rating?.rating ?? null,
      spOffense: rating?.offense.rating ?? null,
      spDefense: rating?.defense.rating ?? null,
      off: side("offense"),
      def: side("defense"),
    };
  });
  return { rows, unmatched };
}
