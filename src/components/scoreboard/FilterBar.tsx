"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Toggle } from "@/components/ui/Toggle";
import { useUrlText } from "@/components/ui/useUrlText";
import { buildHref, type Filters } from "@/lib/scoreboard/params";

type Props = {
  filters: Filters;
  season: number;
  currentSeason: number;
  seasons: number[];
  weeks: { value: string; label: string }[];
  selectedWeek: string;
  conferences: string[];
};

export function FilterBar({
  filters,
  season,
  currentSeason,
  seasons,
  weeks,
  selectedWeek,
  conferences,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (patch: Partial<Filters>) =>
    startTransition(() =>
      router.replace(buildHref(filters, patch), { scroll: false }),
    );

  const [text, setText] = useUrlText(filters.q, (q) => go({ q }));

  const weekIndex = Math.max(
    0,
    weeks.findIndex((w) => w.value === selectedWeek),
  );
  const step = (delta: number) => {
    const next = weeks[weekIndex + delta];
    if (next) go({ week: next.value });
  };

  const hasText = text.trim() !== "";
  const arrowClass =
    "flex size-8 shrink-0 items-center justify-center text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action";

  return (
    <div
      role="search"
      aria-busy={pending}
      className="border-border bg-surface flex h-14 items-center gap-3 border p-3"
    >
      <SelectField
        className="w-46 shrink-0"
        label="Season"
        value={String(season)}
        options={seasons.map((s) => ({ value: String(s), label: String(s) }))}
        onChange={(v) =>
          go({
            season: Number(v) === currentSeason ? null : Number(v),
            week: null,
          })
        }
      />
      <div className="border-border bg-canvas flex h-8 w-53 shrink-0 items-center rounded border">
        <button
          type="button"
          aria-label="Previous week"
          disabled={weekIndex <= 0}
          onClick={() => step(-1)}
          className={`${arrowClass} border-border border-r`}
        >
          <ChevronLeft size={14} aria-hidden />
        </button>
        <span className="text-body text-fg flex-1 text-center whitespace-nowrap">
          {weeks[weekIndex]?.label}
        </span>
        <button
          type="button"
          aria-label="Next week"
          disabled={weekIndex >= weeks.length - 1}
          onClick={() => step(1)}
          className={`${arrowClass} border-border border-l`}
        >
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      <SelectField
        className="w-60 shrink-0"
        label="Conference"
        value={filters.conf ?? "All"}
        active={filters.conf !== null}
        options={[
          { value: "All", label: "All" },
          ...conferences.map((c) => ({ value: c, label: c })),
        ]}
        onChange={(v) => go({ conf: v === "All" ? null : v })}
      />
      <Toggle
        checked={filters.top25}
        onChange={(v) => go({ top25: v })}
        label="Top 25 only"
      />
      <label
        className={`bg-canvas focus-within:border-action flex h-8 min-w-0 flex-1 items-center gap-2 rounded border px-2.5 ${
          hasText ? "border-action" : "border-border"
        }`}
      >
        <Search size={14} className="text-fg-muted shrink-0" aria-hidden />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search a team..."
          aria-label="Search a team"
          className="text-body text-fg placeholder:text-fg-muted min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {hasText && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setText("")}
            className="text-fg-muted hover:text-fg shrink-0"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </label>
    </div>
  );
}
