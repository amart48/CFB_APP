import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/player/Panel";
import type { BoxPlayerTable, BoxScore, Team } from "@/lib/cfbd/models";
import { logoUrl } from "@/lib/utils/logo";
import { playerHref } from "@/lib/utils/slug";

const STAT_W = 48;

function Table({
  table,
  team,
  season,
}: {
  table: BoxPlayerTable;
  team: Team;
  season: number;
}) {
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">
        {team.school} {table.label.toLowerCase()}
      </caption>
      <colgroup>
        <col />
        {table.columns.map((c, i) => (
          <col
            key={c.stat}
            // the last column also carries the row's right padding
            style={{
              width:
                (c.stat === "C/ATT" ? 64 : STAT_W) +
                (i === table.columns.length - 1 ? 16 : 0),
            }}
          />
        ))}
      </colgroup>
      <thead>
        <tr className="text-label text-fg-muted h-6.5">
          <th scope="col" className="text-fg pl-4 text-left font-semibold">
            {table.label.toUpperCase()}
          </th>
          {table.columns.map((c) => (
            <th
              key={c.stat}
              scope="col"
              className="text-right font-normal last:pr-4"
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.playerId} className="h-6">
            <th scope="row" className="pl-4 text-left font-normal">
              {/^\d+$/.test(r.playerId) ? (
                <Link
                  href={playerHref(
                    { playerId: r.playerId, name: r.name, team },
                    season,
                  )}
                  className="text-table text-fg hover:text-action block truncate hover:underline"
                >
                  {r.name}
                </Link>
              ) : (
                // CFBD's team-totals row (negative id): not a player, nothing to link
                <span className="text-table text-fg-muted block truncate">
                  {r.name}
                </span>
              )}
            </th>
            {r.values.map((v, i) => (
              <td
                key={table.columns[i].stat}
                className="text-table text-fg text-right tabular-nums last:pr-4"
              >
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TeamPlayers({
  team,
  tables,
  label,
  season,
  live,
}: {
  team: Team;
  tables: BoxPlayerTable[];
  label: string;
  season: number;
  live: boolean;
}) {
  return (
    <Panel
      title={`${team.school.toUpperCase()} · PLAYER STATS`}
      sub={label}
      leading={
        <Image
          src={logoUrl(team.id, 48)}
          alt=""
          width={14}
          height={14}
          className="size-3.5"
        />
      }
    >
      {tables.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          {live
            ? "Player stats are not available during the game yet."
            : "No player stats yet."}
        </p>
      ) : (
        <div className="divide-border divide-y pb-1.5">
          {tables.map((t) => (
            <div key={t.category} className="py-0.5 first:pt-0">
              <Table table={t} team={team} season={season} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** Passing, rushing, receiving and defense for each team, side by side. */
export function PlayerPanels({ box }: { box: BoxScore }) {
  const season = box.game.season;
  const live = box.game.status === "live";
  return (
    <div className="grid grid-cols-2 items-start gap-5">
      <TeamPlayers
        team={box.away}
        tables={box.awayPlayers}
        label="Away"
        season={season}
        live={live}
      />
      <TeamPlayers
        team={box.home}
        tables={box.homePlayers}
        label="Home"
        season={season}
        live={live}
      />
    </div>
  );
}
