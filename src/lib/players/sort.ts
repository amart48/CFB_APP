import type { PlayerStatRow } from "../cfbd/models";
import type { Dir } from "../teams/columns";
import type { PlayerCategory } from "./categories";

export type PlayerSort = { stat: string; dir: Dir };

/** Natural first-click direction: fewer-is-better columns start ascending. */
export function statDefaultDir(category: PlayerCategory, stat: string): Dir {
  return category.columns.find((c) => c.stat === stat)?.lowerBetter
    ? "asc"
    : "desc";
}

export function defaultPlayerSort(category: PlayerCategory): PlayerSort {
  return {
    stat: category.defaultSort,
    dir: statDefaultDir(category, category.defaultSort),
  };
}

/** Unknown stats fall back to the category default. */
export function parsePlayerSort(
  category: PlayerCategory,
  stat: string | undefined,
  dir: string | undefined,
): PlayerSort {
  if (!stat || !category.columns.some((c) => c.stat === stat))
    return defaultPlayerSort(category);
  return {
    stat,
    dir: dir === "asc" || dir === "desc" ? dir : statDefaultDir(category, stat),
  };
}

export const isDefaultPlayerSort = (
  category: PlayerCategory,
  s: PlayerSort,
) => {
  const d = defaultPlayerSort(category);
  return s.stat === d.stat && s.dir === d.dir;
};

export function nextPlayerSort(
  category: PlayerCategory,
  current: PlayerSort,
  stat: string,
): PlayerSort {
  if (current.stat === stat)
    return { stat, dir: current.dir === "asc" ? "desc" : "asc" };
  return { stat, dir: statDefaultDir(category, stat) };
}

/**
 * Missing values sort last in either direction. Ties break by the category's primary stat
 * (high first), then name, so the order is deterministic.
 */
export function sortPlayers(
  rows: PlayerStatRow[],
  category: PlayerCategory,
  sort: PlayerSort,
): PlayerStatRow[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  const primary = category.defaultSort;
  return [...rows].sort((x, y) => {
    const a = x.stats[sort.stat];
    const b = y.stats[sort.stat];
    if (a === undefined && b !== undefined) return 1;
    if (b === undefined && a !== undefined) return -1;
    if (a !== undefined && b !== undefined && a !== b) return (a - b) * sign;
    const pa = x.stats[primary] ?? -Infinity;
    const pb = y.stats[primary] ?? -Infinity;
    if (pa !== pb) return pb - pa;
    return x.name.localeCompare(y.name);
  });
}
