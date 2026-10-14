"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { Toggle } from "@/components/ui/Toggle";
import { useUrlText } from "@/components/ui/useUrlText";
import type { PlayerCategory } from "@/lib/players/categories";
import { playersHref, type PlayerFilters } from "@/lib/players/params";

type Props = {
  category: PlayerCategory;
  filters: Pick<PlayerFilters, "conf" | "pos" | "q" | "qualified">;
  season: number;
  currentSeason: number;
  seasons: number[];
  conferences: string[];
};

export function PlayersFilterBar({
  category,
  filters,
  season,
  currentSeason,
  seasons,
  conferences,
}: Props) {
  const router = useRouter();
  const query = useSearchParams().toString();
  const [pending, startTransition] = useTransition();

  const go = (patch: Parameters<typeof playersHref>[1]) =>
    startTransition(() =>
      router.replace(playersHref(query, patch), { scroll: false }),
    );

  const [text, setText] = useUrlText(filters.q, (q) => go({ q }));
  const hasText = text.trim() !== "";
  // the current value must always be selectable, even if it is not in the static list
  const positions = [
    ...new Set([...category.positions, ...(filters.pos ? [filters.pos] : [])]),
  ];

  return (
    <div
      role="search"
      aria-busy={pending}
      className="border-border bg-surface grid grid-flow-dense grid-cols-2 gap-2 border p-3 lg:flex lg:h-14 lg:items-center lg:gap-3"
    >
      <SelectField
        className="lg:w-46 lg:shrink-0"
        label="Season"
        value={String(season)}
        options={seasons.map((s) => ({ value: String(s), label: String(s) }))}
        onChange={(v) =>
          go({ season: Number(v) === currentSeason ? null : Number(v) })
        }
      />
      <SelectField
        className="col-span-2 lg:col-span-1 lg:w-60 lg:shrink-0"
        label="Conference"
        value={filters.conf ?? "All"}
        active={filters.conf !== null}
        options={[
          { value: "All", label: "All" },
          ...conferences.map((c) => ({ value: c, label: c })),
        ]}
        onChange={(v) => go({ conf: v === "All" ? null : v })}
      />
      <SelectField
        className="lg:w-44 lg:shrink-0"
        label="Position"
        value={filters.pos ?? "All"}
        active={filters.pos !== null}
        options={[
          { value: "All", label: "All" },
          ...positions.map((p) => ({ value: p, label: p })),
        ]}
        onChange={(v) => go({ pos: v === "All" ? null : v })}
      />
      {category.qualifier && (
        <Toggle
          checked={filters.qualified}
          onChange={(v) => go({ qualified: v })}
          label="Qualified only"
        />
      )}
      <label
        className={`bg-canvas focus-within:border-action order-first col-span-2 flex h-10 min-w-0 items-center gap-2 rounded border px-2.5 lg:order-none lg:h-8 lg:flex-1 ${
          hasText ? "border-action" : "border-border"
        }`}
      >
        <Search size={14} className="text-fg-muted shrink-0" aria-hidden />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search a player or team..."
          aria-label="Search a player or team"
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
