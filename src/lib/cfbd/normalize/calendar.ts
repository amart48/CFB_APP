import type { SeasonType, WeekQuery } from "../config";
import type { RawCalendarWeek } from "../schemas";

/**
 * The calendar entry containing `now` (startDate <= now < endDate). Between
 * windows or after the season it falls back to the latest week that has started,
 * and before the season to the first week.
 */
export function currentWeek(
  calendar: RawCalendarWeek[],
  now: Date,
): WeekQuery | null {
  if (calendar.length === 0) return null;
  const t = now.getTime();
  const sorted = [...calendar].sort(
    (a, b) => Date.parse(a.startDate) - Date.parse(b.startDate),
  );
  const hit =
    sorted.find(
      (w) => Date.parse(w.startDate) <= t && t < Date.parse(w.endDate),
    ) ??
    [...sorted].reverse().find((w) => Date.parse(w.startDate) <= t) ??
    sorted[0];
  return {
    year: hit.season,
    week: hit.week,
    seasonType: (hit.seasonType === "postseason"
      ? "postseason"
      : "regular") as SeasonType,
  };
}
