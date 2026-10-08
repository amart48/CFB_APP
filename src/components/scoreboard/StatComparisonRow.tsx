import type { StatRow } from "@/lib/scoreboard/stat-rows";

const TRACK = 320; // px, bar track width inside a 352px column

type Props = { row: StatRow; awayColor: string; homeColor: string };

/** One stat: value, bar, label, bar, value. Winner at full strength, loser dimmed. */
export function StatComparisonRow({ row, awayColor, homeColor }: Props) {
  const awayWins = row.winner === "away" || row.winner === "tie";
  const homeWins = row.winner === "home" || row.winner === "tie";
  return (
    <div className="text-label flex h-4.75 w-280 items-center tabular-nums">
      <span
        className={`w-27 text-right ${awayWins ? "text-fg-winner font-medium" : "text-fg"}`}
      >
        {row.awayText}
      </span>
      <div className="relative h-4.75 w-88 shrink-0">
        <div className="bg-border absolute top-1.5 left-4 h-1.5 w-80 rounded-[1px]" />
        <div
          className="absolute top-1.5 h-1.5 rounded-[1px]"
          style={{
            // Away bars grow toward the label, so they are anchored to the right edge of the track.
            left: 16 + TRACK * (1 - row.awayFill),
            width: TRACK * row.awayFill,
            backgroundColor: awayColor,
            opacity: awayWins ? 1 : 0.45,
          }}
        />
      </div>
      <span className="text-fg-muted w-50 text-center">{row.label}</span>
      <div className="relative h-4.75 w-88 shrink-0">
        <div className="bg-border absolute top-1.5 left-4 h-1.5 w-80 rounded-[1px]" />
        <div
          className="absolute top-1.5 left-4 h-1.5 rounded-[1px]"
          style={{
            width: TRACK * row.homeFill,
            backgroundColor: homeColor,
            opacity: homeWins ? 1 : 0.45,
          }}
        />
      </div>
      <span
        className={`w-27 ${homeWins ? "text-fg-winner font-medium" : "text-fg"}`}
      >
        {row.homeText}
      </span>
    </div>
  );
}
