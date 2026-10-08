import type { TeamSeasonRow } from "../cfbd/models";
import { COLUMNS, type SortKey } from "./columns";

export type TeamRank = { rank: number; of: number };

/**
 * A team's national rank on every numeric column (ties share the better rank). "Better" follows
 * the column's natural direction, so lower-is-better defense columns rank low values first.
 * Null where the team has no value.
 */
export function rankTeam(
  rows: TeamSeasonRow[],
  teamId: number,
): Partial<Record<SortKey, TeamRank | null>> {
  const me = rows.find((r) => r.team.id === teamId);
  const out: Partial<Record<SortKey, TeamRank | null>> = {};
  for (const col of COLUMNS) {
    if (col.key === "team" || col.key === "rec") continue;
    const mine = me ? col.value(me) : null;
    if (typeof mine !== "number") {
      out[col.key] = null;
      continue;
    }
    const values = rows
      .map((r) => col.value(r))
      .filter((v): v is number => typeof v === "number");
    const better = values.filter((v) =>
      col.defaultDir === "asc" ? v < mine : v > mine,
    ).length;
    out[col.key] = { rank: better + 1, of: values.length };
  }
  return out;
}
