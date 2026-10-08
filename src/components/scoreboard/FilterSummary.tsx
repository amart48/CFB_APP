import { X } from "lucide-react";
import Link from "next/link";
import {
  buildHref,
  clearFiltersHref,
  hasActiveFilters,
  type Filters,
} from "@/lib/scoreboard/params";

type Props = { count: number; filters: Filters };

export function FilterSummary({ count, filters }: Props) {
  const chips = [
    filters.conf && {
      label: filters.conf,
      href: buildHref(filters, { conf: null }),
    },
    filters.top25 && {
      label: "Top 25 only",
      href: buildHref(filters, { top25: false }),
    },
    filters.q.trim() && {
      label: filters.q.trim(),
      href: buildHref(filters, { q: "" }),
    },
  ].filter((c): c is { label: string; href: string } => Boolean(c));

  return (
    <div className="flex h-9 items-center justify-between">
      <div className="flex items-center gap-3">
        <p
          aria-live="polite"
          className="text-table text-fg-muted whitespace-nowrap"
        >
          {count} {count === 1 ? "game" : "games"}
        </p>
        {hasActiveFilters(filters) && (
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
              href={clearFiltersHref(filters)}
              className="text-table text-action whitespace-nowrap"
            >
              Clear filters
            </Link>
          </>
        )}
      </div>
      <p className="text-label text-fg-muted whitespace-nowrap">
        AP rankings · All times ET
      </p>
    </div>
  );
}
