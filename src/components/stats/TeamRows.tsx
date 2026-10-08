import Image from "next/image";
import { COLUMNS, GROUP_STARTS } from "@/lib/teams/columns";
import type { TeamSeasonRow } from "@/lib/cfbd/models";
import type { Sort } from "@/lib/teams/sort";
import { logoUrl } from "@/lib/utils/logo";
import { teamHref } from "@/lib/utils/slug";
import Link from "next/link";

type Props = {
  rows: TeamSeasonRow[];
  sort: Sort;
  /** Season to carry into team links (null = current season). */
  season?: number | null;
};

export function TeamRows({ rows, sort, season = null }: Props) {
  return rows.map((row, i) => (
    <tr
      key={row.team.id}
      className="border-border bg-surface hover:bg-surface-raised h-8 border-b"
    >
      <td className="text-table text-fg-muted relative pl-4 tabular-nums">
        <span
          aria-hidden
          className="absolute top-0 left-0 h-8 w-0.5"
          style={{ backgroundColor: row.team.color }}
        />
        {i + 1}
      </td>
      {COLUMNS.map((c) => {
        const sorted = sort.key === c.key;
        const divider = GROUP_STARTS.has(c.key) ? "border-l border-border" : "";
        if (c.key === "team") {
          return (
            <td key={c.key} className="overflow-hidden">
              <div className="flex items-center gap-2">
                <Image
                  src={logoUrl(row.team.id, 48)}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 shrink-0"
                />
                <Link
                  href={teamHref(row.team, season)}
                  className="text-body text-fg hover:text-action truncate hover:underline"
                >
                  {row.team.school}
                </Link>
                <span className="text-label text-fg-muted shrink-0">
                  {row.team.conference}
                </span>
              </div>
            </td>
          );
        }
        const tone =
          c.key === "rec"
            ? "text-fg-muted"
            : sorted
              ? "text-fg-winner"
              : "text-fg";
        return (
          <td
            key={c.key}
            className={`text-table pr-2 text-right tabular-nums ${tone} ${divider} ${
              sorted ? "bg-surface-raised" : ""
            } ${c.key === "defPpg" ? "pr-6" : ""}`}
          >
            {c.format(row)}
          </td>
        );
      })}
    </tr>
  ));
}
