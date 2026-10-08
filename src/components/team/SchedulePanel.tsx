import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/player/Panel";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import type { ScheduleRow } from "@/lib/cfbd/models";
import { logoUrl } from "@/lib/utils/logo";
import { gameHref, teamHref } from "@/lib/utils/slug";
import { formatEtShortDate, formatEtTime } from "@/lib/utils/time";

const PREFIX = { home: "vs", away: "@", neutral: "N" } as const;

/** Result or kickoff time, linking to the game's box score. */
function Result({ g, team }: { g: ScheduleRow; team: { school: string } }) {
  const opp = { school: g.opponent.name };
  const href =
    g.site === "away"
      ? gameHref(g.gameId, team, opp)
      : gameHref(g.gameId, opp, team);
  const link = "hover:text-action hover:underline";
  if (g.result) {
    return (
      <Link
        href={href}
        className={`${link} ${g.result === "W" ? "text-fg-winner font-bold" : "text-fg-muted"}`}
      >
        {g.result} {g.pointsFor}–{g.pointsAgainst}
      </Link>
    );
  }
  return (
    <Link href={href} className={`${link} text-fg-muted`}>
      {g.startTbd ? "TBD" : `${formatEtTime(g.startUtc)} ET`}
    </Link>
  );
}

export function SchedulePanel({ profile }: { profile: TeamProfile }) {
  const fbs = new Map(profile.index.teams.map((t) => [t.id, t]));
  const games = profile.schedule;
  return (
    <Panel
      title="SCHEDULE & RESULTS"
      sub={`${profile.season} · ${games.length} games`}
    >
      {games.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          No games scheduled.
        </p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">Schedule and results</caption>
          <colgroup>
            <col style={{ width: 72 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 320 }} />
            <col style={{ width: 140 }} />
            <col />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr className="border-border text-label tracking-label text-fg-muted h-7.5 border-b">
              <th scope="col" className="pl-4 text-left font-normal">
                WK
              </th>
              <th scope="col" className="text-left font-normal">
                DATE
              </th>
              <th scope="col" className="text-left font-normal">
                OPPONENT
              </th>
              <th scope="col" className="text-left font-normal">
                RESULT
              </th>
              <th scope="col" className="text-left font-normal">
                VENUE
              </th>
              <th scope="col" className="text-left font-normal">
                TYPE
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const opp = fbs.get(g.opponent.id);
              return (
                <tr
                  key={g.gameId}
                  className="border-border h-8 border-b last:border-b-0"
                >
                  <td className="text-table text-fg-muted pl-4 tabular-nums">
                    {g.week}
                  </td>
                  <td className="text-table text-fg-muted">
                    {formatEtShortDate(g.startUtc)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-label text-fg-muted w-4">
                        {PREFIX[g.site]}
                      </span>
                      <Image
                        src={logoUrl(g.opponent.id, 48)}
                        alt=""
                        width={20}
                        height={20}
                        className="size-5 shrink-0"
                      />
                      {opp ? (
                        <Link
                          href={teamHref(opp, profile.season)}
                          className="text-body text-fg hover:text-action truncate hover:underline"
                        >
                          {g.opponent.name}
                        </Link>
                      ) : (
                        <span className="text-body text-fg truncate">
                          {g.opponent.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-table tabular-nums">
                    <Result g={g} team={profile.team} />
                  </td>
                  <td className="text-table text-fg-muted truncate">
                    {g.venue || "—"}
                  </td>
                  <td className="text-label text-fg-muted">
                    {g.seasonType === "postseason"
                      ? "Postseason"
                      : g.conferenceGame
                        ? "Conference"
                        : "Non-conference"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
