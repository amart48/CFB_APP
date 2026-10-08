import type { RawRankingWeek } from "../schemas";

export const AP_POLL = "AP Top 25";

/** teamId to AP rank. Ties are fine (shared ranks). Empty map if the poll is absent. */
export function apRankMap(weeks: RawRankingWeek[]): Map<number, number> {
  const map = new Map<number, number>();
  const poll = weeks[0]?.polls.find((p) => p.poll === AP_POLL);
  for (const r of poll?.ranks ?? []) {
    if (r.teamId != null) map.set(r.teamId, r.rank);
  }
  return map;
}
