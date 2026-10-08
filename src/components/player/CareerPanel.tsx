import Link from "next/link";
import { attempt } from "@/lib/cfbd/attempt";
import { loadCareer, type PlayerProfile } from "@/lib/cfbd/loaders";
import { CATEGORY_BY_ID, formatStat } from "@/lib/players/categories";
import { Panel } from "./Panel";

const gridFor = (n: number) => ({
  gridTemplateColumns: `120px 220px repeat(${n}, minmax(0, 1fr))`,
});

/** One row per active season for the player's primary category. */
export async function CareerPanel({ profile }: { profile: PlayerProfile }) {
  const category = profile.primary
    ? CATEGORY_BY_ID.get(profile.primary)
    : undefined;
  if (!category || profile.seasons.length < 2) return null;

  const result = await attempt(() => loadCareer(profile));
  const rows = result.ok ? [...result.data].reverse() : [];
  const n = category.columns.length;

  return (
    <Panel
      title={`CAREER · ${category.label.toUpperCase()}`}
      sub={`${profile.seasons.length} seasons`}
    >
      {!result.ok ? (
        <p className="text-table text-fg-muted px-4 py-6" role="alert">
          {result.message}
        </p>
      ) : (
        <>
          <div
            className="border-border text-label tracking-label text-fg-muted grid h-7.5 items-center border-b px-4"
            style={gridFor(n)}
          >
            <span>SEASON</span>
            <span>TEAM</span>
            {category.columns.map((c) => (
              <span key={c.stat} className="pr-2 text-right">
                {c.label}
              </span>
            ))}
          </div>
          {rows.map((r) => {
            const selected = r.season === profile.season;
            return (
              <div
                key={r.season}
                className={`border-border text-table relative grid h-8 items-center border-b px-4 last:border-b-0 ${
                  selected ? "bg-surface-raised text-fg-winner" : "text-fg"
                }`}
                style={gridFor(n)}
              >
                {selected && (
                  <span
                    aria-hidden
                    className="bg-action absolute top-0 left-0 h-8 w-0.5"
                  />
                )}
                <Link
                  href={`?season=${r.season}`}
                  replace
                  scroll={false}
                  aria-current={selected ? "true" : undefined}
                  className="hover:text-action w-fit"
                >
                  {r.season}
                </Link>
                <span>{r.team}</span>
                {category.columns.map((c) => (
                  <span key={c.stat} className="pr-2 text-right tabular-nums">
                    {r.stats ? formatStat(r.stats[c.stat], c.format) : "—"}
                  </span>
                ))}
              </div>
            );
          })}
        </>
      )}
    </Panel>
  );
}
