import type { PlayerCategory } from "../../players/categories";
import type { PlayerStatRow, Team } from "../models";
import type { RawPlayerStat } from "../schemas";

export type PlayerRowsResult = {
  rows: PlayerStatRow[];
  /** Raw rows whose team is not an FBS school we know (dropped). */
  droppedTeams: string[];
};

/**
 * Pivots one row per (player, stat) into one row per player. `teamGames` maps team id to games
 * played so the per-game qualifier can be applied.
 */
export function buildPlayerRows(
  raw: RawPlayerStat[],
  teams: Team[],
  category: PlayerCategory,
  teamGames: Map<number, number>,
): PlayerRowsResult {
  const bySchool = new Map(teams.map((t) => [t.school, t]));
  const players = new Map<string, PlayerStatRow>();
  const dropped = new Set<string>();

  for (const r of raw) {
    if (r.category !== category.id) continue;
    const team = bySchool.get(r.team);
    if (!team) {
      dropped.add(r.team);
      continue;
    }
    const value = Number.parseFloat(String(r.stat));
    if (!Number.isFinite(value)) continue;
    // A player can appear for more than one team in a season, so key on both.
    const key = `${r.playerId}|${team.id}`;
    const row = players.get(key) ?? {
      playerId: r.playerId,
      name: r.player,
      position: r.position ?? "",
      team,
      stats: {},
      qualified: false,
    };
    row.stats[r.statType] = value;
    players.set(key, row);
  }

  const q = category.qualifier;
  const rows = [...players.values()].map((row) => {
    const games = teamGames.get(row.team.id) ?? 0;
    return {
      ...row,
      qualified:
        !q || (games > 0 && (row.stats[q.stat] ?? 0) >= q.perGame * games),
    };
  });
  return { rows, droppedTeams: [...dropped] };
}
