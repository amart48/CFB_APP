import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { GameRow, Team, TeamGameStats } from "@/lib/cfbd/models";
import { buildStatRows } from "@/lib/scoreboard/stat-rows";
import { readableOnDark } from "@/lib/utils/color";
import { gameHref } from "@/lib/utils/slug";
import { StatComparisonRow } from "./StatComparisonRow";

type Props = {
  id: string;
  game: GameRow;
  away: Team;
  home: Team;
  stats: TeamGameStats[] | undefined;
};

function BoxScoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-label text-action focus-visible:outline-action mt-2 flex items-center gap-1 hover:underline focus-visible:outline-2"
    >
      Full box score
      <ArrowUpRight size={12} aria-hidden />
    </Link>
  );
}

function heading(team: Team, plays: number | null | undefined) {
  return plays ? `${team.school} · ${plays} plays` : team.school;
}

/** Inline head-to-head team stats, shown under an expanded game row. */
export function StatPanel({ id, game, away, home, stats }: Props) {
  const awayStats = stats?.find((s) => s.teamId === away.id);
  const homeStats = stats?.find((s) => s.teamId === home.id);
  const state = game.status === "live" ? "LIVE" : "FINAL";

  return (
    <div
      id={id}
      className="border-border bg-canvas flex flex-col items-center overflow-x-auto border-b pb-3"
    >
      {awayStats && homeStats ? (
        <div className="w-full px-3 lg:w-280 lg:px-0">
          <div className="text-label flex h-7 items-center justify-between gap-2 whitespace-nowrap">
            <span className="text-fg font-semibold">
              {heading(away, awayStats.plays)}
            </span>
            <span className="text-micro text-fg-muted hidden tracking-[0.8px] lg:inline">
              TEAM STATS · {state}
            </span>
            <span className="text-fg font-semibold">
              {heading(home, homeStats.plays)}
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
          <BoxScoreLink href={gameHref(game.id, away, home)} />
        </div>
      ) : (
        <>
          <p className="text-table text-fg-muted pt-6 pb-3">
            {game.status === "scheduled"
              ? "Team stats appear once the game kicks off."
              : "Team stats are not available for this game yet."}
          </p>
          <BoxScoreLink href={gameHref(game.id, away, home)} />
        </>
      )}
    </div>
  );
}
