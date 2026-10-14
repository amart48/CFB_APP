import { Panel } from "@/components/player/Panel";
import { StatComparisonRow } from "@/components/scoreboard/StatComparisonRow";
import type { BoxScore } from "@/lib/cfbd/models";
import { buildStatRows } from "@/lib/scoreboard/stat-rows";
import { readableOnDark } from "@/lib/utils/color";

const heading = (school: string, plays: number | null) =>
  plays ? `${school} · ${plays} plays` : school;

/** Head-to-head team stats: the scoreboard's comparison rows at full width. */
export function TeamStatsPanel({ box }: { box: BoxScore }) {
  const { away, home, awayStats, homeStats, game } = box;
  const state = game.status === "live" ? "LIVE" : "FINAL";
  return (
    <Panel title="TEAM STATS" sub={game.status === "live" ? "Live" : undefined}>
      {awayStats && homeStats ? (
        <div className="flex flex-col items-center overflow-x-auto px-3 pt-2 pb-3 lg:px-0">
          <div className="text-label flex h-7 w-full items-center justify-between gap-2 whitespace-nowrap lg:w-280">
            <span className="text-fg font-semibold">
              {heading(away.school, awayStats.plays)}
            </span>
            <span className="text-micro text-fg-muted hidden tracking-[0.8px] lg:inline">
              TEAM STATS · {state}
            </span>
            <span className="text-fg font-semibold">
              {heading(home.school, homeStats.plays)}
            </span>
          </div>
          {buildStatRows(awayStats, homeStats).map((row) => (
            <StatComparisonRow
              key={row.label}
              row={row}
              awayColor={readableOnDark(away.color, away.altColor)}
              homeColor={readableOnDark(home.color, home.altColor)}
            />
          ))}
        </div>
      ) : (
        <p className="text-table text-fg-muted px-4 py-6">
          {game.status === "scheduled"
            ? "Team stats appear once the game kicks off."
            : game.status === "live"
              ? "Team stats are not available during the game yet."
              : "Team stats are not available for this game."}
        </p>
      )}
    </Panel>
  );
}
