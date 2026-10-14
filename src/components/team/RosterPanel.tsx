import Link from "next/link";
import { Panel } from "@/components/player/Panel";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import {
  formatHeight,
  inRosterFilter,
  type RosterFilter,
} from "@/lib/cfbd/normalize";
import { playerHref } from "@/lib/utils/slug";

const FILTERS: { id: RosterFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "offense", label: "Offense" },
  { id: "defense", label: "Defense" },
  { id: "special", label: "Special teams" },
];

type Props = { profile: TeamProfile; filter: RosterFilter; query: string };

/** Link that sets (or clears) the position-group filter while keeping the other params. */
function filterHref(query: string, id: RosterFilter) {
  const sp = new URLSearchParams(query);
  if (id === "all") sp.delete("group");
  else sp.set("group", id);
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

export function RosterPanel({ profile, filter, query }: Props) {
  const players = profile.roster.filter((p) => inRosterFilter(p, filter));
  return (
    <Panel
      title="ROSTER"
      sub={`${players.length} ${players.length === 1 ? "player" : "players"}`}
    >
      <nav
        aria-label="Position group"
        className="border-border flex gap-2 overflow-x-auto border-b p-3"
      >
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Link
              key={f.id}
              href={filterHref(query, f.id)}
              replace
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={`text-label flex h-6 shrink-0 items-center rounded-[3px] border px-2.5 ${
                active
                  ? "border-action text-action"
                  : "border-border text-fg-muted hover:text-fg"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 table-fixed border-collapse">
          <caption className="sr-only">Roster</caption>
          <colgroup>
            <col style={{ width: 72 }} />
            <col style={{ width: 260 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 80 }} />
            <col />
          </colgroup>
          <thead>
            <tr className="border-border text-label tracking-label text-fg-muted h-7.5 border-b">
              <th scope="col" className="pl-4 text-left font-normal">
                #
              </th>
              <th scope="col" className="text-left font-normal">
                PLAYER
              </th>
              <th scope="col" className="text-left font-normal">
                POS
              </th>
              <th scope="col" className="text-left font-normal">
                CLASS
              </th>
              <th scope="col" className="pr-2 text-right font-normal">
                HT
              </th>
              <th scope="col" className="pr-2 text-right font-normal">
                WT
              </th>
              <th scope="col" className="pl-6 text-left font-normal">
                HOMETOWN
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.id}
                className="border-border hover:bg-surface-raised h-8 border-b last:border-b-0"
              >
                <td className="text-table text-fg-muted pl-4 tabular-nums">
                  {p.jersey ?? "—"}
                </td>
                <td className="truncate">
                  <Link
                    href={playerHref(
                      { playerId: p.id, name: p.name, team: profile.team },
                      profile.season,
                    )}
                    className="text-body text-fg hover:text-action hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="text-table text-fg-muted">
                  {p.position || "—"}
                </td>
                <td className="text-table text-fg">{p.classYear ?? "—"}</td>
                <td className="text-table text-fg pr-2 text-right tabular-nums">
                  {formatHeight(p.heightInches) ?? "—"}
                </td>
                <td className="text-table text-fg pr-2 text-right tabular-nums">
                  {p.weightLbs ?? "—"}
                </td>
                <td className="text-table text-fg truncate pl-6">
                  {p.hometown ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
