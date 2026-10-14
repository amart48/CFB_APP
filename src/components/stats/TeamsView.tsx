"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { StateBody } from "@/components/scoreboard/StateMessage";
import type { TeamSeasonRow } from "@/lib/cfbd/models";
import type { SortKey } from "@/lib/teams/columns";
import {
  hasActiveTeamFilters,
  teamsHref,
  type TeamFilters,
} from "@/lib/teams/params";
import { nextSort, sortCaption, sortRows, type Sort } from "@/lib/teams/sort";
import { TeamRows } from "./TeamRows";
import { TeamsTableFrame } from "./TeamsTableFrame";

type Props = {
  /** Already filtered by conference and search on the server. */
  rows: TeamSeasonRow[];
  filters: Pick<TeamFilters, "conf" | "q">;
  initialSort: Sort;
  /** Season for team links (null = current). */
  season?: number | null;
};

/** Summary row plus the sortable table. Sorting is instant and mirrored into the URL. */
export function TeamsView({
  rows,
  filters,
  initialSort,
  season = null,
}: Props) {
  const [sort, setSort] = useState(initialSort);
  const query = useSearchParams().toString();
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);

  const onSort = (key: SortKey) => {
    const next = nextSort(sort, key);
    setSort(next);
    // Keep the URL shareable without a server round trip.
    window.history.replaceState(
      null,
      "",
      teamsHref(window.location.search.slice(1), { sort: next }),
    );
  };

  const chips = [
    filters.conf && {
      label: filters.conf,
      href: teamsHref(query, { conf: null }),
    },
    filters.q.trim() && {
      label: filters.q.trim(),
      href: teamsHref(query, { q: "" }),
    },
  ].filter((c): c is { label: string; href: string } => Boolean(c));

  return (
    <>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            aria-live="polite"
            className="text-table text-fg-muted whitespace-nowrap"
          >
            {rows.length} {rows.length === 1 ? "team" : "teams"}
          </p>
          {hasActiveTeamFilters(filters) && (
            <>
              <span aria-hidden className="bg-border h-3.5 w-px" />
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  aria-label={`Remove filter ${chip.label}`}
                  className="border-action text-label text-action flex h-6 items-center gap-2 rounded-[3px] border px-2 whitespace-nowrap"
                >
                  {chip.label}
                  <X size={11} aria-hidden />
                </Link>
              ))}
              <Link
                href={teamsHref(query, { conf: null, q: "" })}
                className="text-table text-action whitespace-nowrap"
              >
                Clear filters
              </Link>
            </>
          )}
        </div>
        <p className="text-label text-fg-muted whitespace-nowrap">
          {sortCaption(sort)} · Select a column heading to sort
        </p>
      </div>
      <TeamsTableFrame sort={sort} onSort={onSort}>
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={16}>
              <StateBody
                variant="empty"
                title="No teams match these filters"
                message="Try another team or clear your conference filter."
                action={{
                  href: teamsHref(query, { conf: null, q: "" }),
                  label: "Clear filters",
                }}
              />
            </td>
          </tr>
        ) : (
          <TeamRows rows={sorted} sort={sort} season={season} />
        )}
      </TeamsTableFrame>
    </>
  );
}
