import Image from "next/image";
import { Panel } from "@/components/player/Panel";
import type { BoxScore } from "@/lib/cfbd/models";
import { driveDetail, playPeriod } from "@/lib/boxscore/format";
import { logoUrl } from "@/lib/utils/logo";

/** Scoring drives in order, with the running score when the drive data reconciles. */
export function ScoringSummary({ box }: { box: BoxScore }) {
  const { scoring, away, home, game } = box;
  const withScore = scoring.length > 0 && scoring[0].homeScore !== null;
  return (
    <Panel
      title="SCORING SUMMARY"
      sub={
        scoring.length > 0
          ? `${scoring.length} scoring ${scoring.length === 1 ? "drive" : "drives"}`
          : undefined
      }
    >
      {scoring.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          {game.status === "scheduled"
            ? "Scoring appears once the game starts."
            : game.status === "live"
              ? "The scoring summary is not available during the game yet."
              : "No scoring recorded for this game."}
        </p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">Scoring summary</caption>
          <colgroup>
            <col style={{ width: 112 }} />
            <col style={{ width: 260 }} />
            <col />
            {withScore && <col style={{ width: 80 }} />}
            {withScore && <col style={{ width: 88 }} />}
          </colgroup>
          <thead>
            <tr className="border-border text-label tracking-label text-fg-muted h-6.5 border-b">
              <th scope="col" className="pl-4 text-left font-normal">
                PERIOD
              </th>
              <th scope="col" className="text-left font-normal">
                TEAM
              </th>
              <th scope="col" className="text-left font-normal">
                DRIVE
              </th>
              {withScore && (
                <>
                  <th scope="col" className="text-right font-normal">
                    {away.abbreviation}
                  </th>
                  <th scope="col" className="pr-4 text-right font-normal">
                    {home.abbreviation}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {scoring.map((p) => {
              const team = p.side === "home" ? home : away;
              return (
                <tr
                  key={p.driveId}
                  className="border-border h-7 border-b last:border-b-0"
                >
                  <td className="text-table text-fg-muted pl-4 tabular-nums">
                    {playPeriod(p)}
                  </td>
                  <td>
                    <span className="flex items-center gap-2">
                      <Image
                        src={logoUrl(team.id, 48)}
                        alt=""
                        width={16}
                        height={16}
                        className="size-4 shrink-0"
                      />
                      <span className="text-table text-fg truncate">
                        {team.school}
                      </span>
                    </span>
                  </td>
                  <td className="text-table truncate">
                    <span className="text-fg-winner font-medium">
                      {p.result}
                    </span>{" "}
                    <span className="text-fg-muted">{driveDetail(p)}</span>
                  </td>
                  {withScore && (
                    <>
                      {(["away", "home"] as const).map((side) => (
                        <td
                          key={side}
                          className={`text-table text-right tabular-nums ${side === "home" ? "pr-4" : ""} ${p.side === side ? "text-fg-winner font-semibold" : "text-fg"}`}
                        >
                          {side === "home" ? p.homeScore : p.awayScore}
                        </td>
                      ))}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
