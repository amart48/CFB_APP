import { Suspense } from "react";
import { StateMessage } from "@/components/scoreboard/StateMessage";
import { Attribution } from "@/components/scoreboard/PageHeader";
import { TeamsFilterBar } from "@/components/stats/TeamsFilterBar";
import { TeamsResults } from "@/components/stats/TeamsResults";
import { TeamsSkeleton } from "@/components/stats/TeamsSkeleton";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamsIndex, seasonOf } from "@/lib/cfbd/loaders";
import { parseTeamFilters } from "@/lib/teams/params";

const FIRST_SEASON = 2015;

export const metadata = { title: "Team Stats · CFB Stats" };

function Heading({ season }: { season: number }) {
  return (
    <div className="flex h-21 items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-heading text-fg font-normal">Team Stats</h1>
        <p className="text-body text-fg-muted">
          {season} Season · All FBS teams
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

export default async function TeamsPage(props: PageProps<"/teams">) {
  const filters = parseTeamFilters(await props.searchParams);
  const result = await attempt(() => loadTeamsIndex(filters.season));

  if (!result.ok) {
    return (
      <main className="mx-auto w-full max-w-360 px-4 md:px-10">
        <Heading season={filters.season ?? seasonOf(new Date())} />
        <StateMessage
          variant="error"
          title="Couldn't load team stats"
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
      <TeamsFilterBar
        filters={{ conf: filters.conf, q: filters.q }}
        season={index.season}
        currentSeason={index.currentSeason}
        seasons={seasons}
        conferences={index.conferences}
      />
      <div className="pt-0">
        {/* Keyed on season only: filter and sort changes keep the old table until the new one is ready. */}
        <Suspense key={index.season} fallback={<TeamsSkeleton />}>
          <TeamsResults index={index} filters={filters} />
        </Suspense>
      </div>
      <Attribution />
    </main>
  );
}
