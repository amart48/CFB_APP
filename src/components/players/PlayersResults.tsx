import { X } from "lucide-react";
import Link from "next/link";
import { StateBody } from "@/components/scoreboard/StateMessage";
import { attempt } from "@/lib/cfbd/attempt";
import { loadPlayerRows, type TeamsIndex } from "@/lib/cfbd/loaders";
import { playerCaption } from "@/lib/players/caption";
import {
  filterPlayers,
  hasActivePlayerFilters,
  PAGE_SIZE,
  MAX_LIMIT,
  playersHref,
  type PlayerFilters,
} from "@/lib/players/params";
import { sortPlayers } from "@/lib/players/sort";
import { PlayersTable } from "./PlayersTable";

type Props = { index: TeamsIndex; filters: PlayerFilters; query: string };

const Cell = ({ children }: { children: React.ReactNode }) => (
  <tr>
    <td colSpan={20}>{children}</td>
  </tr>
);

/** Loads one category, then filters, sorts and trims to the visible page on the server. */
export async function PlayersResults({ index, filters, query }: Props) {
  const { category, sort } = filters;
  const result = await attempt(() => loadPlayerRows(index, category));
  if (!result.ok) {
    return (
      <PlayersTable
        category={category}
        sort={sort}
        query={query}
        interactive={false}
      >
        <Cell>
          <StateBody
            variant="error"
            title="Couldn't load player stats"
            message={result.message}
          />
        </Cell>
      </PlayersTable>
    );
  }

  const matches = filterPlayers(result.data, filters);
  const shown = sortPlayers(matches, category, sort).slice(0, filters.limit);
  const clearHref = playersHref(query, { conf: null, pos: null, q: "" });
  const chips = [
    filters.conf && {
      label: filters.conf,
      href: playersHref(query, { conf: null }),
    },
    filters.pos && {
      label: filters.pos,
      href: playersHref(query, { pos: null }),
    },
    filters.q.trim() && {
      label: filters.q.trim(),
      href: playersHref(query, { q: "" }),
    },
  ].filter((c): c is { label: string; href: string } => Boolean(c));

  return (
    <>
      <div className="flex h-9 items-center justify-between">
        <div className="flex items-center gap-3">
          <p
            aria-live="polite"
            className="text-table text-fg-muted whitespace-nowrap"
          >
            {matches.length === 0
              ? "0 players"
              : shown.length < matches.length
                ? `Showing ${shown.length} of ${matches.length.toLocaleString("en-US")} players`
                : `${matches.length.toLocaleString("en-US")} ${matches.length === 1 ? "player" : "players"}`}
          </p>
          {hasActivePlayerFilters(filters) && (
            <>
              <span aria-hidden className="bg-border h-3.5 w-px" />
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  replace
                  aria-label={`Remove filter ${chip.label}`}
                  className="border-action text-label text-action flex h-6 items-center gap-2 rounded-[3px] border px-2 whitespace-nowrap"
                >
                  {chip.label}
                  <X size={11} aria-hidden />
                </Link>
              ))}
              <Link
                href={clearHref}
                replace
                className="text-table text-action whitespace-nowrap"
              >
                Clear filters
              </Link>
            </>
          )}
        </div>
        <p className="text-label text-fg-muted whitespace-nowrap">
          {playerCaption(category, sort, filters.qualified)}
        </p>
      </div>
      <PlayersTable
        category={category}
        sort={sort}
        query={query}
        rows={shown}
        season={index.season}
      >
        {shown.length === 0 ? (
          <Cell>
            <StateBody
              variant="empty"
              title="No players match these filters"
              message="Try another name, or clear your conference, position and qualification filters."
              action={{
                href: playersHref(query, {
                  conf: null,
                  pos: null,
                  q: "",
                  qualified: false,
                }),
                label: "Clear filters",
              }}
            />
          </Cell>
        ) : undefined}
      </PlayersTable>
      {shown.length < matches.length && filters.limit < MAX_LIMIT && (
        <div className="border-border bg-surface flex h-14 items-center justify-center border border-t-0">
          <Link
            href={playersHref(query, {
              limit: Math.min(filters.limit + PAGE_SIZE, MAX_LIMIT),
            })}
            replace
            scroll={false}
            className="border-action text-body text-action hover:bg-action/10 flex h-8 items-center rounded border px-4 font-medium"
          >
            Show {PAGE_SIZE} more
          </Link>
        </div>
      )}
    </>
  );
}
