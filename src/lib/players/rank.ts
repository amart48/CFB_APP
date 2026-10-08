import type { PlayerStatRow } from "../cfbd/models";
import type { PlayerCategory } from "./categories";

export type StatRank = { rank: number; of: number };

/**
 * A player's rank per stat among QUALIFIED FBS players in the category (ties share the better
 * rank). Null when the player is not qualified or has no value for the stat.
 */
export function rankPlayer(
  rows: PlayerStatRow[],
  category: PlayerCategory,
  playerId: string,
  teamId: number,
): Record<string, StatRank | null> {
  const pool = rows.filter((r) => r.qualified);
  const me = pool.find((r) => r.playerId === playerId && r.team.id === teamId);
  const out: Record<string, StatRank | null> = {};
  for (const col of category.columns) {
    const mine = me?.stats[col.stat];
    if (mine === undefined) {
      out[col.stat] = null;
      continue;
    }
    const values = pool
      .map((r) => r.stats[col.stat])
      .filter((v): v is number => v !== undefined);
    const better = values.filter((v) =>
      col.lowerBetter ? v < mine : v > mine,
    ).length;
    out[col.stat] = { rank: better + 1, of: values.length };
  }
  return out;
}
