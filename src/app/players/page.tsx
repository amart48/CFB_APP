import { Suspense } from "react";
import { StateMessage } from "@/components/scoreboard/StateMessage";
import { Attribution } from "@/components/scoreboard/PageHeader";
import { CategoryTabs } from "@/components/players/CategoryTabs";
import { PlayersFilterBar } from "@/components/players/PlayersFilterBar";
import { PlayersResults } from "@/components/players/PlayersResults";
import { PlayersSkeleton } from "@/components/players/PlayersSkeleton";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamsIndex, seasonOf } from "@/lib/cfbd/loaders";
import { parsePlayerFilters } from "@/lib/players/params";

const FIRST_SEASON = 2015;

export async function generateMetadata(props: PageProps<"/players">) {
  const { category } = parsePlayerFilters(await props.searchParams);
  return { title: `${category.label} Leaders · CFB Stats` };
}

function Heading({ season }: { season: number }) {
  return (
    <div className="flex h-21 items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-heading text-fg font-normal">Player Stats</h1>
        <p className="text-body text-fg-muted">
          {season} Season · All FBS players
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <span aria-hidden className="bg-fg-muted size-1.25" />
        <span className="text-label tracking-caps text-fg-muted whitespace-nowrap">
          NCAA FOOTBALL · FBS
        </span>
      </div>
    </div>
  );
}

export default async function PlayersPage(props: PageProps<"/players">) {
  const raw = await props.searchParams;
  const filters = parsePlayerFilters(raw);
  // Rebuild the query string for building links (only known, sanitized params matter downstream).
  const query = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
  const result = await attempt(() => loadTeamsIndex(filters.season));

  if (!result.ok) {
    return (
      <main className="mx-auto w-full max-w-360 px-4 md:px-10">
        <Heading season={filters.season ?? seasonOf(new Date())} />
        <StateMessage
          variant="error"
          title="Couldn't load player stats"
          message={result.message}
        />
        <Attribution />
      </main>
    );
  }

  const index = result.data;
  const seasons = Array.from(
    { length: index.currentSeason - FIRST_SEASON + 1 },
    (_, i) => index.currentSeason - i,
  );

  return (
    <main className="mx-auto w-full max-w-360 px-4 md:px-10">
      <Heading season={index.season} />
      <CategoryTabs active={filters.category} query={query} />
      <PlayersFilterBar
        category={filters.category}
        filters={filters}
        season={index.season}
        currentSeason={index.currentSeason}
        seasons={seasons}
        conferences={index.conferences}
      />
      {/* Keyed on season + category: filter and sort changes keep the old table until the new one is ready. */}
      <Suspense
        key={`${index.season}-${filters.category.id}`}
        fallback={
          <PlayersSkeleton category={filters.category} sort={filters.sort} />
        }
      >
        <PlayersResults index={index} filters={filters} query={query} />
      </Suspense>
      <Attribution />
    </main>
  );
}
