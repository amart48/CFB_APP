"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { useUrlText } from "@/components/ui/useUrlText";
import { teamsHref, type TeamFilters } from "@/lib/teams/params";

type Props = {
  filters: Pick<TeamFilters, "conf" | "q">;
  season: number;
  currentSeason: number;
  seasons: number[];
  conferences: string[];
};

export function TeamsFilterBar({
  filters,
  season,
  currentSeason,
  seasons,
  conferences,
}: Props) {
  const router = useRouter();
  const query = useSearchParams().toString();
  const [pending, startTransition] = useTransition();

  const go = (patch: Parameters<typeof teamsHref>[1]) =>
    startTransition(() =>
      router.replace(teamsHref(query, patch), { scroll: false }),
    );

  const [text, setText] = useUrlText(filters.q, (q) => go({ q }));
  const hasText = text.trim() !== "";

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
          go({ season: Number(v) === currentSeason ? null : Number(v) })
        }
      />
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
