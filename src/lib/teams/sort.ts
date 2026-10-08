import type { TeamSeasonRow } from "../cfbd/models";
import { COLUMN_BY_KEY, type Dir, type SortKey } from "./columns";

export type Sort = { key: SortKey; dir: Dir };

export const DEFAULT_SORT: Sort = { key: "spOverall", dir: "desc" };

export const isDefaultSort = (s: Sort) =>
  s.key === DEFAULT_SORT.key && s.dir === DEFAULT_SORT.dir;

export function defaultDir(key: SortKey): Dir {
  return COLUMN_BY_KEY.get(key)?.defaultDir ?? "desc";
}

/** Clicking the sorted column flips direction; any other column starts at its natural direction. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key)
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: defaultDir(key) };
}

/** Unknown or missing values fall back to the default sort. */
export function parseSort(
  key: string | undefined,
  dir: string | undefined,
): Sort {
  if (!key || !COLUMN_BY_KEY.has(key as SortKey)) return DEFAULT_SORT;
  const k = key as SortKey;
  return { key: k, dir: dir === "asc" || dir === "desc" ? dir : defaultDir(k) };
}

function compareValues(a: number | string, b: number | string): number {
  return typeof a === "string" || typeof b === "string"
    ? String(a).localeCompare(String(b))
    : a - b;
}

/**
 * Nulls sort last in either direction. Ties break by SP+ overall (high first),
 * then school name, so the order is always deterministic.
 */
export function sortRows(rows: TeamSeasonRow[], sort: Sort): TeamSeasonRow[] {
  const col = COLUMN_BY_KEY.get(sort.key);
  if (!col) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((x, y) => {
    const a = col.value(x);
    const b = col.value(y);
    if (a === null && b !== null) return 1;
    if (b === null && a !== null) return -1;
    if (a !== null && b !== null) {
      const c = compareValues(a, b);
      if (c !== 0) return c * sign;
    }
    if (x.spOverall !== y.spOverall) {
      if (x.spOverall === null) return 1;
      if (y.spOverall === null) return -1;
      return y.spOverall - x.spOverall;
    }
    return x.team.school.localeCompare(y.team.school);
  });
}

/** "Sorted by Def SP+ (best first)". */
export function sortCaption(sort: Sort): string {
  const col = COLUMN_BY_KEY.get(sort.key);
  if (!col) return "";
  if (sort.key === "team")
    return `Sorted by Team (${sort.dir === "asc" ? "A to Z" : "Z to A"})`;
  return `Sorted by ${col.fullLabel} (${sort.dir === col.defaultDir ? "best first" : "worst first"})`;
}
