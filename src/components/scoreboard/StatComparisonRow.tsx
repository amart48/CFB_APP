import type { StatRow } from "@/lib/scoreboard/stat-rows";

type Props = { row: StatRow; awayColor: string; homeColor: string };

/**
 * One stat: value, bar, label, bar, value. Winner at full strength, loser dimmed.
 * From lg this is a single 1120px line; below it the values and label share a line and
 * the two bars sit under them, each filling its half of the width.
 */
export function StatComparisonRow({ row, awayColor, homeColor }: Props) {
  const awayWins = row.winner === "away" || row.winner === "tie";
  const homeWins = row.winner === "home" || row.winner === "tie";
  const track = "relative h-1.5 lg:h-4.75 lg:w-88 lg:shrink-0";
  // 320px bar inside the 352px desktop track; full width below lg.
  const rail =
    "bg-border absolute inset-x-0 top-0 h-1.5 rounded-[1px] lg:inset-x-4 lg:top-1.5";
  return (
    <div className="text-label grid w-full grid-cols-2 items-center gap-x-2 gap-y-1 py-1.5 tabular-nums lg:flex lg:h-4.75 lg:w-280 lg:gap-0 lg:py-0">
      <span
        className={`col-start-1 row-start-1 lg:w-27 lg:text-right ${awayWins ? "text-fg-winner font-medium" : "text-fg"}`}
      >
        {row.awayText}
      </span>
      <div className={`${track} col-start-1 row-start-2`}>
        <div className={rail}>
          <div
            className="absolute inset-y-0 right-0 rounded-[1px]"
            // Away bars grow toward the label, so they are anchored to the right edge of the rail.
            style={{
              width: `${row.awayFill * 100}%`,
              backgroundColor: awayColor,
              opacity: awayWins ? 1 : 0.45,
            }}
          />
        </div>
      </div>
      <span className="text-fg-muted pointer-events-none col-span-2 col-start-1 row-start-1 text-center lg:w-50">
        {row.label}
      </span>
      <div className={`${track} col-start-2 row-start-2`}>
        <div className={rail}>
          <div
            className="absolute inset-y-0 left-0 rounded-[1px]"
            style={{
              width: `${row.homeFill * 100}%`,
              backgroundColor: homeColor,
              opacity: homeWins ? 1 : 0.45,
            }}
          />
        </div>
      </div>
      <span
        className={`col-start-2 row-start-1 text-right lg:w-27 lg:text-left ${homeWins ? "text-fg-winner font-medium" : "text-fg"}`}
      >
        {row.homeText}
      </span>
    </div>
  );
}
