import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PlayerStatRow } from "@/lib/cfbd/models";
import { formatStat, type PlayerCategory } from "@/lib/players/categories";
import { playersHref } from "@/lib/players/params";
import { nextPlayerSort, type PlayerSort } from "@/lib/players/sort";
import { STICKY_COL, TableScroll } from "@/components/ui/TableScroll";
import { logoUrl } from "@/lib/utils/logo";
import { playerHref } from "@/lib/utils/slug";

type Props = {
  category: PlayerCategory;
  sort: PlayerSort;
  query: string;
  /** Rows to show (already filtered, sorted and limited). Omit for a headings-only table. */
  rows?: PlayerStatRow[];
  /** Replaces the body, e.g. skeleton, empty or error state. */
  children?: React.ReactNode;
  interactive?: boolean;
  /** Season the rows are from, carried into player links. */
  season?: number | null;
};

/** Sortable player table. Headings are links, so sorting is a server render of cached data. */
export function PlayersTable({
  category,
  sort,
  query,
  rows,
  children,
  interactive = true,
  season = null,
}: Props) {
  const Arrow = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableScroll>
      <table className="border-border bg-surface w-full min-w-300 table-fixed border-collapse border">
        <caption className="sr-only">{category.label} leaders</caption>
        <colgroup>
          <col className="hidden md:table-column" style={{ width: 72 }} />
          <col className="w-44 md:w-57" />
          <col style={{ width: 200 }} />
          {category.columns.map((c) => (
            <col key={c.stat} />
          ))}
        </colgroup>
        <thead className="bg-surface sticky top-0 z-10">
          <tr className="border-border text-label tracking-label text-fg-muted h-8 border-b">
            <th
              scope="col"
              className="hidden pl-4 text-left font-normal md:table-cell"
            >
              RK
            </th>
            <th
              scope="col"
              className={`bg-surface pl-3 text-left font-normal md:pl-0 ${STICKY_COL}`}
            >
              PLAYER
            </th>
            <th scope="col" className="text-left font-normal">
              TEAM
            </th>
            {category.columns.map((c, i) => {
              const sorted = sort.stat === c.stat;
              const last = i === category.columns.length - 1;
              const label = (
                <>
                  {sorted && <Arrow size={11} aria-hidden />}
                  {c.label}
                </>
              );
              return (
                <th
                  key={c.stat}
                  scope="col"
                  aria-sort={
                    sorted
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`p-0 font-normal ${sorted ? "bg-surface-raised text-fg" : ""}`}
                >
                  {interactive ? (
                    <Link
                      href={playersHref(query, {
                        sort: nextPlayerSort(category, sort, c.stat),
                      })}
                      replace
                      scroll={false}
                      prefetch={false}
                      className={`hover:text-fg focus-visible:outline-action flex h-8 items-center justify-end gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                        last ? "pr-6" : "pr-2"
                      }`}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span
                      className={`flex h-8 items-center justify-end gap-1 ${last ? "pr-6" : "pr-2"}`}
                    >
                      {label}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="[counter-reset:rank]">
          {children ??
            rows?.map((row, i) => (
              <tr
                key={`${row.playerId}-${row.team.id}`}
                className="border-border bg-surface hover:bg-surface-raised h-8 border-b [counter-increment:rank]"
              >
                <td className="text-table text-fg-muted relative hidden pl-4 tabular-nums md:table-cell">
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 h-8 w-0.5"
                    style={{ backgroundColor: row.team.color }}
                  />
                  {i + 1}
                </td>
                <td
                  className={`relative overflow-hidden bg-inherit ${STICKY_COL}`}
                >
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 h-8 w-0.5 md:hidden"
                    style={{ backgroundColor: row.team.color }}
                  />
                  <div className="flex items-baseline gap-2 pl-3 md:pl-0">
                    <span
                      aria-hidden
                      className="text-label text-fg-muted w-5 shrink-0 text-right tabular-nums before:content-[counter(rank)] md:hidden"
                    />
                    <Link
                      href={playerHref(row, season)}
                      className="text-body text-fg hover:text-action truncate hover:underline"
                    >
                      {row.name}
                    </Link>
                    <span className="text-label text-fg-muted shrink-0">
                      {row.position}
                    </span>
                  </div>
                </td>
                <td className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <Image
                      src={logoUrl(row.team.id, 48)}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 shrink-0"
                    />
                    <span className="text-table text-fg truncate">
                      {row.team.school}
                    </span>
                  </div>
                </td>
                {category.columns.map((c, ci) => (
                  <td
                    key={c.stat}
                    className={`text-table text-right tabular-nums ${
                      ci === category.columns.length - 1 ? "pr-6" : "pr-2"
                    } ${sort.stat === c.stat ? "bg-surface-raised text-fg-winner" : "text-fg"}`}
                  >
                    {formatStat(row.stats[c.stat], c.format)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
