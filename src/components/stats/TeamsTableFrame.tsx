"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import {
  COLUMNS,
  GROUP_STARTS,
  GROUPS,
  type SortKey,
} from "@/lib/teams/columns";
import type { Sort } from "@/lib/teams/sort";

type Props = {
  sort: Sort;
  /** Omit for a non-interactive head (loading and empty states). */
  onSort?: (key: SortKey) => void;
  children: React.ReactNode;
};

const FIRST_COLS = 3; // RK, TEAM, REC
const divider = "border-l border-border";

/** Column widths from the Figma frames; the team column takes the remaining space. */
function Cols() {
  return (
    <colgroup>
      <col style={{ width: 72 }} />
      {COLUMNS.map((c) => (
        <col
          key={c.key}
          style={
            c.key === "team"
              ? undefined
              : { width: c.key === "defPpg" ? c.width + 16 : c.width }
          }
        />
      ))}
    </colgroup>
  );
}

function Head({ sort, onSort }: Pick<Props, "sort" | "onSort">) {
  return (
    <thead className="bg-surface sticky top-0 z-10">
      <tr className="border-border bg-surface-raised text-label text-fg-muted h-7 border-b tracking-wide">
        <th colSpan={FIRST_COLS} aria-hidden />
        {GROUPS.map((g) => (
          <th
            key={g.label}
            colSpan={g.span}
            scope="colgroup"
            className={`${divider} pl-3 text-left font-normal`}
          >
            {g.label}
          </th>
        ))}
      </tr>
      <tr className="border-border text-label tracking-label text-fg-muted h-8 border-b">
        <th scope="col" className="pl-4 text-left font-normal">
          RK
        </th>
        {COLUMNS.map((c) => {
          const sorted = sort.key === c.key;
          const left = c.group === "team" && c.key === "team";
          const Arrow = sort.dir === "asc" ? ArrowUp : ArrowDown;
          return (
            <th
              key={c.key}
              scope="col"
              aria-sort={
                sorted
                  ? sort.dir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
              className={`p-0 font-normal ${GROUP_STARTS.has(c.key) ? divider : ""} ${
                sorted ? "bg-surface-raised text-fg" : ""
              }`}
            >
              <button
                type="button"
                disabled={!onSort}
                onClick={() => onSort?.(c.key)}
                className={`focus-visible:outline-action enabled:hover:text-fg flex h-8 w-full items-center gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                  left ? "justify-start" : "justify-end pr-2"
                } ${c.key === "defPpg" ? "pr-6" : ""}`}
              >
                {sorted && <Arrow size={11} aria-hidden />}
                {c.label}
              </button>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export function TeamsTableFrame({ sort, onSort, children }: Props) {
  return (
    <table className="border-border bg-surface w-full min-w-340 table-fixed border-collapse border">
      <caption className="sr-only">Team season statistics</caption>
      <Cols />
      <Head sort={sort} onSort={onSort} />
      <tbody>{children}</tbody>
    </table>
  );
}
