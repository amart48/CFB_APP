"use client";

import { useState } from "react";
import type { Team, TeamGameStats } from "@/lib/cfbd/models";
import type { DayGroup } from "@/lib/scoreboard/games";
import { GAME_GRID } from "./columns";
import { GameRow } from "./GameRow";
import { StatPanel } from "./StatPanel";

type Props = {
  groups: DayGroup[];
  teams: Record<number, Team>;
  stats: Record<number, TeamGameStats[]>;
};

export function ColumnHeadings() {
  return (
    <div
      className={`${GAME_GRID} border-border bg-surface text-label tracking-label text-fg-muted sticky top-0 z-10 h-8 border-b px-4`}
    >
      <span>STATUS</span>
      <span className="pl-7">AWAY TEAM</span>
      <span className="text-center">SCORE</span>
      <span className="pl-7">HOME TEAM</span>
      <span className="text-center">SCORE</span>
      <span>SPREAD / RESULT</span>
      <span>NETWORK</span>
      <span aria-hidden />
    </div>
  );
}

/** Day-grouped game table. One game's stat panel is open at a time. */
export function GameList({ groups, teams, stats }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="border-border bg-surface min-w-300 border">
      <ColumnHeadings />
      {groups.map((group) => (
        <section key={group.key} aria-label={group.heading}>
          <h2 className="border-border bg-surface-raised text-label flex h-7 items-center justify-between border-b px-4">
            <span className="text-fg font-semibold">{group.heading}</span>
            <span className="text-fg-muted font-normal">
              {group.games.length} {group.games.length === 1 ? "game" : "games"}
            </span>
          </h2>
          {group.games.map((game) => {
            const away = teams[game.away.teamId];
            const home = teams[game.home.teamId];
            if (!away || !home) return null;
            const open = openId === game.id;
            const panelId = `stats-${game.id}`;
            return (
              <div key={game.id}>
                <GameRow
                  game={game}
                  away={away}
                  home={home}
                  expanded={open}
                  onToggle={() => setOpenId(open ? null : game.id)}
                  panelId={panelId}
                />
                {open && (
                  <StatPanel
                    id={panelId}
                    game={game}
                    away={away}
                    home={home}
                    stats={stats[game.id]}
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
