import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import type { GameRow as GameRowModel, Team } from "@/lib/cfbd/models";
import { statusLabel, winnerSide } from "@/lib/scoreboard/status";
import { logoUrl } from "@/lib/utils/logo";
import { favoriteResult, spreadLabel } from "@/lib/utils/spread";
import { GAME_GRID } from "./columns";

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
}: {
  team: Team;
  rank: number | null;
  emphasis: Emphasis;
  neutral?: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 items-center gap-2">
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
}: {
  points: number | null;
  emphasis: Emphasis;
}) {
  const style =
    emphasis === "winner"
      ? "font-bold text-fg-winner"
      : emphasis === "loser"
        ? "font-medium text-fg-muted"
        : "font-medium text-fg-winner";
  return (
    <span className={`text-body text-center ${style}`}>{points ?? "—"}</span>
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
      className={`${GAME_GRID} border-border relative h-9 cursor-pointer border-b px-4 tabular-nums ${
        expanded ? "bg-surface-raised" : "bg-surface hover:bg-surface-raised"
      }`}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 h-9 w-0.5"
        style={{ backgroundColor: away.color }}
      />
      <span
        className={`text-label flex items-center gap-1.25 ${live ? "text-fg" : "text-fg-muted"}`}
      >
        {live && (
          <span aria-hidden className="bg-live size-1 shrink-0 rounded-full" />
        )}
        {statusLabel(game)}
      </span>
      <TeamCell
        team={away}
        rank={game.away.apRank}
        emphasis={emphasis("away")}
      />
      <Score points={game.away.points} emphasis={scoreEmphasis("away")} />
      <TeamCell
        team={home}
        rank={game.home.apRank}
        emphasis={emphasis("home")}
        neutral={game.neutralSite}
      />
      <Score points={game.home.points} emphasis={scoreEmphasis("home")} />
      <span className="text-table text-fg-muted truncate">
        {spreadText(game, away, home)}
      </span>
      <span className="text-table text-fg-muted truncate">
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
        className="text-fg-muted hover:text-fg focus-visible:outline-action flex h-full items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2"
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
