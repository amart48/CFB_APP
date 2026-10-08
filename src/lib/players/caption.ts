import type { PlayerCategory } from "./categories";
import { statDefaultDir, type PlayerSort } from "./sort";

/** "Sorted by YDS (best first) · Min. 15 pass attempts per team game". */
export function playerCaption(
  category: PlayerCategory,
  sort: PlayerSort,
  qualified: boolean,
): string {
  const col = category.columns.find((c) => c.stat === sort.stat);
  const order =
    sort.dir === statDefaultDir(category, sort.stat)
      ? "best first"
      : "worst first";
  const sorted = `Sorted by ${col?.label ?? sort.stat} (${order})`;
  const q = category.qualifier;
  if (!q) return `${sorted} · No minimum for this category`;
  return qualified
    ? `${sorted} · Min. ${q.perGame} ${q.noun} per team game`
    : `${sorted} · All players`;
}
