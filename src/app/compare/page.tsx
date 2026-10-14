import { Suspense } from "react";
import { CompareBar } from "@/components/compare/CompareBar";
import { CompareResults } from "@/components/compare/CompareResults";
import { Attribution } from "@/components/scoreboard/PageHeader";
import { StateBody, StateMessage } from "@/components/scoreboard/StateMessage";
import { TeamsSkeleton } from "@/components/stats/TeamsSkeleton";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamsIndex, seasonOf } from "@/lib/cfbd/loaders";
import { parseCompareParams } from "@/lib/compare/compare";

const FIRST_SEASON = 2015;

export const metadata = { title: "Compare Teams · CFB Stats" };

function Heading({ season }: { season: number }) {
  return (
    <div className="flex h-21 items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-heading text-fg font-normal">Compare Teams</h1>
        <p className="text-body text-fg-muted">
          {season} Season · Head-to-head season stats
        </p>
      </div>
    </div>
  );
}

// Cold CFBD calls take 3-8s each; Vercel's default limit is too tight for a cold page.
export const maxDuration = 60;

export default async function ComparePage(props: PageProps<"/compare">) {
  const params = parseCompareParams(await props.searchParams);
  const result = await attempt(() => loadTeamsIndex(params.season));

  if (!result.ok) {
    return (
      <main className="mx-auto w-full max-w-360 px-4 md:px-10">
        <Heading season={params.season ?? seasonOf(new Date())} />
        <StateMessage
          variant="error"
          title="Couldn't load teams"
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
  const teams = [...index.teams]
    .sort((x, y) => x.school.localeCompare(y.school))
    .map((t) => ({ id: t.id, school: t.school }));
  const ready = params.a !== null && params.b !== null;

  return (
    <main className="mx-auto w-full max-w-360 px-4 md:px-10">
      <Heading season={index.season} />
      <CompareBar
        season={index.season}
        currentSeason={index.currentSeason}
        seasons={seasons}
        teams={teams}
        a={params.a}
        b={params.b}
      />
      <div className="pt-5">
        {ready ? (
          <Suspense
            key={`${index.season}-${params.a}-${params.b}`}
            fallback={<TeamsSkeleton />}
          >
            <CompareResults index={index} a={params.a!} b={params.b!} />
          </Suspense>
        ) : (
          <div className="border-border bg-surface border">
            <StateBody
              variant="empty"
              title="Pick two teams"
              message="Choose Team A and Team B above to compare their season stats."
            />
          </div>
        )}
      </div>
      <Attribution />
    </main>
  );
}
