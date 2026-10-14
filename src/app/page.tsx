import { Suspense } from "react";
import { FilterBar } from "@/components/scoreboard/FilterBar";
import { GamesSkeleton } from "@/components/scoreboard/GamesSkeleton";
import { Attribution, PageHeader } from "@/components/scoreboard/PageHeader";
import { ScoreboardResults } from "@/components/scoreboard/ScoreboardResults";
import { StateMessage } from "@/components/scoreboard/StateMessage";
import { attempt } from "@/lib/cfbd/attempt";
import { loadMeta, seasonOf } from "@/lib/cfbd/loaders";
import { parseFilters } from "@/lib/scoreboard/params";

const FIRST_SEASON = 2015;

// Cold CFBD calls take 3-8s each; Vercel's default limit is too tight for a cold page.
export const maxDuration = 60;

export default async function ScoreboardPage(props: PageProps<"/">) {
  const filters = parseFilters(await props.searchParams);
  const result = await attempt(() =>
    loadMeta({ season: filters.season, week: filters.week }),
  );

  if (!result.ok) {
    return (
      <Shell>
        <PageHeader
          season={filters.season ?? seasonOf(new Date())}
          weekLabel="Unavailable"
        />
        <StateMessage
          variant="error"
          title="Couldn't load the scoreboard"
          message={result.message}
        />
      </Shell>
    );
  }

  const meta = result.data;
  const currentSeason = seasonOf(new Date());
  const seasons = Array.from(
    { length: currentSeason - FIRST_SEASON + 1 },
    (_, i) => currentSeason - i,
  );

  return (
    <Shell>
      <PageHeader season={meta.season} weekLabel={meta.selected.label} />
      <FilterBar
        filters={filters}
        season={meta.season}
        currentSeason={currentSeason}
        seasons={seasons}
        weeks={meta.weeks.map((w) => ({ value: w.value, label: w.label }))}
        selectedWeek={meta.selected.value}
        conferences={meta.conferences}
      />
      {/* Keyed on season + week only, so changing a filter keeps the old table until the new one is ready. */}
      <Suspense
        key={`${meta.season}-${meta.selected.value}`}
        fallback={<GamesSkeleton />}
      >
        <ScoreboardResults meta={meta} filters={filters} />
      </Suspense>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-360 px-4 md:px-10">
      {children}
      <Attribution />
    </main>
  );
}
