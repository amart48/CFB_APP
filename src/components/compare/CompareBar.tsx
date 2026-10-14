"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { compareHref, type CompareParams } from "@/lib/compare/compare";

type Props = {
  season: number;
  currentSeason: number;
  seasons: number[];
  teams: { id: number; school: string }[];
  a: number | null;
  b: number | null;
};

const NONE = "none";

export function CompareBar({
  season,
  currentSeason,
  seasons,
  teams,
  a,
  b,
}: Props) {
  const router = useRouter();
  const query = useSearchParams().toString();
  const [pending, startTransition] = useTransition();

  const go = (patch: Partial<CompareParams>) =>
    startTransition(() =>
      router.replace(compareHref(query, patch), { scroll: false }),
    );

  const options = [
    { value: NONE, label: "Choose a team" },
    ...teams.map((t) => ({ value: String(t.id), label: t.school })),
  ];
  const team = (v: string) => (v === NONE ? null : Number(v));

  return (
    <div
      role="search"
      aria-busy={pending}
      className="border-glass-border bg-glass grid grid-cols-2 gap-2 border p-3 backdrop-blur-md lg:flex lg:h-14 lg:items-center lg:gap-3"
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
        className="col-span-2 lg:col-span-1 lg:min-w-0 lg:flex-1"
        label="Team A"
        value={a === null ? NONE : String(a)}
        active={a !== null}
        options={options}
        onChange={(v) => go({ a: team(v) })}
      />
      <SelectField
        className="col-span-2 lg:col-span-1 lg:min-w-0 lg:flex-1"
        label="Team B"
        value={b === null ? NONE : String(b)}
        active={b !== null}
        options={options}
        onChange={(v) => go({ b: team(v) })}
      />
    </div>
  );
}
