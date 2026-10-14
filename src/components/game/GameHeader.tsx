import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/player/Panel";
import type { BoxScore, Team } from "@/lib/cfbd/models";
import {
  lineScoreCells,
  lineScoreColumns,
  overtimeLabel,
  periodHeading,
} from "@/lib/boxscore/format";
import { liveClockLabel, winnerSide } from "@/lib/scoreboard/status";
import { logoUrl } from "@/lib/utils/logo";
import { teamHref } from "@/lib/utils/slug";
import { formatEtShortDate, formatEtTime } from "@/lib/utils/time";

type Side = "home" | "away";

function title(box: BoxScore): string {
  const { game } = box;
  if (game.status === "live") return "LIVE";
  if (game.status === "scheduled") return "SCHEDULED";
  const ot = overtimeLabel(game.home.lineScores ?? game.away.lineScores);
  return ot ? `FINAL · ${ot}` : "FINAL";
}

function subtitle(box: BoxScore): string {
  const { game } = box;
  const when = game.startTbd
    ? `${formatEtShortDate(game.startUtc)} · TBD`
    : `${formatEtShortDate(game.startUtc)} · ${formatEtTime(game.startUtc)} ET`;
  return [
    when,
    game.venue,
    game.neutralSite ? "Neutral site" : null,
    game.conferenceGame ? "Conference game" : null,
    game.tv,
  ]
    .filter(Boolean)
    .join(" · ");
}

function TeamName({ box, side }: { box: BoxScore; side: Side }) {
  const team: Team = box[side];
  const rank = box.game[side].apRank;
  const winner = winnerSide(box.game) === side;
  const name = (
    <span
      className={`text-supporting tracking-[-0.6px] ${winner ? "text-fg-winner font-bold" : "text-fg"}`}
    >
      {team.school}
    </span>
  );
  return (
    <div
      className={`flex flex-col gap-1 ${side === "home" ? "items-start md:items-end" : "items-start"}`}
    >
      <div className="flex items-baseline gap-2">
        {box.fbs[side] ? (
          <Link
            href={teamHref(team, box.game.season)}
            className="hover:underline"
          >
            {name}
          </Link>
        ) : (
          name
        )}
        {rank !== null && (
          <span
            aria-label={`AP rank ${rank}`}
            className="text-label text-fg-muted"
          >
            {rank}
          </span>
        )}
      </div>
      <span className="text-table text-fg-muted">
        {[team.conference, side === "home" ? "Home" : "Away"]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  );
}

function TeamBlock({ box, side }: { box: BoxScore; side: Side }) {
  const logo = (
    <Image
      src={logoUrl(box[side].id, 96)}
      alt=""
      width={48}
      height={48}
      className="size-12 shrink-0"
    />
  );
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-4 ${side === "home" ? "flex-row-reverse justify-end md:flex-row" : ""}`}
    >
      {side === "away" && logo}
      <TeamName box={box} side={side} />
      {side === "home" && logo}
    </div>
  );
}

function Score({ box, side }: { box: BoxScore; side: Side }) {
  const { game } = box;
  const winner = winnerSide(game);
  const style =
    game.status === "live" || winner === side
      ? "text-fg-winner"
      : game.status === "final"
        ? "text-fg-muted"
        : "text-fg-muted";
  return (
    <span
      className={`text-heading font-bold tabular-nums ${style}`}
      aria-label={`${box[side].school} score`}
    >
      {game[side].points ?? "—"}
    </span>
  );
}

function Status({ box }: { box: BoxScore }) {
  const { game } = box;
  if (game.status === "live") {
    return (
      <div className="flex w-42 flex-col items-center gap-1">
        <span className="text-label tracking-caps text-fg flex items-center gap-1.5 font-semibold">
          <span aria-hidden className="bg-live size-1.5 rounded-full" />
          LIVE
        </span>
        <span className="text-body text-fg tabular-nums">
          {game.period && game.clock
            ? liveClockLabel(game.period, game.clock)
            : "In progress"}
        </span>
        {game.situation && (
          <span className="text-label text-fg-muted text-center">
            {game.situation}
          </span>
        )}
      </div>
    );
  }
  if (game.status === "final") {
    const ot = overtimeLabel(game.home.lineScores ?? game.away.lineScores);
    return (
      <div className="text-fg-muted flex w-24 flex-col items-center gap-1">
        <span className="text-label tracking-caps font-semibold">FINAL</span>
        {ot && <span className="text-table">{ot}</span>}
      </div>
    );
  }
  return (
    <div className="text-fg-muted flex w-24 flex-col items-center gap-1">
      <span className="text-label tracking-caps font-semibold">KICKOFF</span>
      <span className="text-table tabular-nums">
        {game.startTbd ? "TBD" : `${formatEtTime(game.startUtc)} ET`}
      </span>
    </div>
  );
}

function LineScore({ box }: { box: BoxScore }) {
  const { game } = box;
  const columns = lineScoreColumns(box);
  if (game.home.lineScores === null && game.away.lineScores === null) {
    return null;
  }
  const winner = winnerSide(game);
  const cell = "w-10 text-right tabular-nums md:w-14";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-80 table-fixed border-collapse">
        <caption className="sr-only">Line score</caption>
        <thead>
          <tr className="border-border text-label text-fg-muted h-6.5 border-b">
            <th
              scope="col"
              className="tracking-label pl-4 text-left font-normal"
            >
              LINE SCORE
            </th>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} scope="col" className={`${cell} font-normal`}>
                {periodHeading(i + 1)}
              </th>
            ))}
            <th
              scope="col"
              className="w-14 pr-4 text-right font-normal md:w-18"
            >
              T
            </th>
          </tr>
        </thead>
        <tbody>
          {(["away", "home"] as const).map((side, i) => (
            <tr
              key={side}
              className={`border-border h-7 ${i === 0 ? "border-b" : ""}`}
            >
              <th scope="row" className="pl-4 text-left font-normal">
                <span className="flex items-center gap-2">
                  <Image
                    src={logoUrl(box[side].id, 48)}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 shrink-0"
                  />
                  <span
                    className={`text-table truncate ${winner === side ? "text-fg-winner font-semibold" : "text-fg"}`}
                  >
                    {box[side].school}
                  </span>
                </span>
              </th>
              {lineScoreCells(game[side].lineScores, columns).map((v, j) => (
                <td
                  key={j}
                  className={`${cell} text-table ${v === null ? "text-fg-muted" : "text-fg"}`}
                >
                  {v ?? "—"}
                </td>
              ))}
              <td className="text-table text-fg-winner w-14 pr-4 text-right font-semibold tabular-nums md:w-18">
                {game[side].points ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Status, date and venue bar; the score; and the line score table. */
export function GameHeader({ box }: { box: BoxScore }) {
  const live = box.game.status === "live";
  return (
    <Panel
      title={title(box)}
      sub={subtitle(box)}
      leading={
        live ? (
          <span aria-hidden className="bg-live size-1.5 rounded-full" />
        ) : undefined
      }
    >
      {/* Below md: a team and its score per line, status underneath. From md: one row. */}
      <div className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b px-4 py-4 md:flex md:h-28 md:gap-7 md:px-10 md:py-0">
        <div className="col-start-1 row-start-1 flex md:contents">
          <TeamBlock box={box} side="away" />
        </div>
        <div className="col-start-2 row-start-1 md:contents">
          <Score box={box} side="away" />
        </div>
        <div className="col-span-2 row-start-3 flex justify-center md:contents">
          <Status box={box} />
        </div>
        <div className="col-start-2 row-start-2 md:contents">
          <Score box={box} side="home" />
        </div>
        <div className="col-start-1 row-start-2 flex md:contents">
          <TeamBlock box={box} side="home" />
        </div>
      </div>
      <LineScore box={box} />
    </Panel>
  );
}
