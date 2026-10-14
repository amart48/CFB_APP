import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import type { GameRow as GameRowModel, Team } from "@/lib/cfbd/models";
import { statusLabel, winnerSide } from "@/lib/scoreboard/status";
import { logoUrl } from "@/lib/utils/logo";
import { favoriteResult, spreadLabel } from "@/lib/utils/spread";
import { CARD_CELL, CARD_GRID, GAME_GRID } from "./columns";

type Emphasis = "winner" | "loser" | "normal";

const NAME_STYLE: Record<Emphasis, string> = {
  winner: "font-bold text-fg-winner",
  loser: "text-fg-muted",
  normal: "text-fg",
};

function TeamCell({
  team,
  rank,
  emphasis,
  neutral,
  className,
}: {
  className: string;
  team: Team;
  rank: number | null;
  emphasis: Emphasis;
  neutral?: boolean;
}) {
  return (
    <div
      className={`flex h-6 min-w-0 items-center gap-2 md:h-full ${className}`}
    >
      <Image
        src={logoUrl(team.id, 48)}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0"
      />
      <span className={`text-body truncate ${NAME_STYLE[emphasis]}`}>
        {team.school}
      </span>
      {rank !== null && (
        <span className="text-label text-fg-muted shrink-0">{rank}</span>
      )}
      {neutral && (
        <span
          title="Neutral site"
          className="border-border text-micro text-fg-muted shrink-0 rounded-[2px] border px-1"
        >
          N
        </span>
      )}
    </div>
  );
}

function Score({
  points,
  emphasis,
  className,
}: {
  points: number | null;
  emphasis: Emphasis;
  className: string;
}) {
  const style =
    emphasis === "winner"
      ? "font-bold text-fg-winner"
      : emphasis === "loser"
        ? "font-medium text-fg-muted"
        : "font-medium text-fg-winner";
  return (
    <span
      className={`text-title md:text-body min-w-8 self-center text-right md:min-w-0 md:text-center ${style} ${className}`}
    >
      {points ?? "—"}
    </span>
  );
}

function spreadText(g: GameRowModel, away: Team, home: Team): string {
  const label = spreadLabel(g.spreadHome, home.abbreviation, away.abbreviation);
  if (!label) return "—";
  if (g.status !== "final" || g.spreadHome === null) return label;
  if (g.home.points === null || g.away.points === null) return label;
  const result = favoriteResult(g.home.points, g.away.points, g.spreadHome);
  if (!result) return label;
  return `${label} · ${result === "covered" ? "Covered" : result === "missed" ? "Missed" : "Push"}`;
}

type Props = {
  game: GameRowModel;
  away: Team;
  home: Team;
  expanded: boolean;
  onToggle: () => void;
  panelId: string;
};

export function GameRow({
  game,
  away,
  home,
  expanded,
  onToggle,
  panelId,
}: Props) {
  const live = game.status === "live";
  const winner = winnerSide(game);
  const emphasis = (side: "home" | "away"): Emphasis =>
    winner === null ? "normal" : winner === side ? "winner" : "loser";
  const scoreEmphasis = (side: "home" | "away"): Emphasis =>
    live ? "normal" : emphasis(side);

  return (
    <div
      onClick={onToggle}
      className={`${CARD_GRID} ${GAME_GRID} border-border relative cursor-pointer border-b py-2 pr-1 pl-3 tabular-nums md:h-9 md:py-0 md:pr-4 md:pl-4 ${
        expanded ? "bg-surface-raised" : "bg-surface hover:bg-surface-raised"
      }`}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-full w-0.5"
        style={{ backgroundColor: away.color }}
      />
      <span
        className={`text-label flex items-center gap-1.25 ${CARD_CELL.status} ${live ? "text-fg" : "text-fg-muted"}`}
      >
        {live && (
          <span aria-hidden className="bg-live size-1 shrink-0 rounded-full" />
        )}
        {statusLabel(game)}
      </span>
      <TeamCell
        className={CARD_CELL.awayTeam}
        team={away}
        rank={game.away.apRank}
        emphasis={emphasis("away")}
      />
      <Score
        className={CARD_CELL.awayScore}
        points={game.away.points}
        emphasis={scoreEmphasis("away")}
      />
      <TeamCell
        className={CARD_CELL.homeTeam}
        team={home}
        rank={game.home.apRank}
        emphasis={emphasis("home")}
        neutral={game.neutralSite}
      />
      <Score
        className={CARD_CELL.homeScore}
        points={game.home.points}
        emphasis={scoreEmphasis("home")}
      />
      <span className={`text-table text-fg-muted truncate ${CARD_CELL.spread}`}>
        {spreadText(game, away, home)}
      </span>
      <span
        className={`text-table text-fg-muted truncate ${CARD_CELL.network}`}
      >
        {game.tv ?? "—"}
      </span>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${expanded ? "Hide" : "Show"} team stats: ${away.school} at ${home.school}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`text-fg-muted hover:text-fg focus-visible:outline-action flex h-full items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 ${CARD_CELL.expand}`}
      >
        {expanded ? (
          <ChevronUp size={14} aria-hidden />
        ) : (
          <ChevronDown size={14} aria-hidden />
        )}
      </button>
    </div>
  );
}
