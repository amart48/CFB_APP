import { attempt } from "@/lib/cfbd/attempt";
import { loadWeekData, type ScoreboardMeta } from "@/lib/cfbd/loaders";
import type { Team } from "@/lib/cfbd/models";
import { filterGames, groupByDay } from "@/lib/scoreboard/games";
import {
  clearFiltersHref,
  hasActiveFilters,
  type Filters,
} from "@/lib/scoreboard/params";
import { FilterSummary } from "./FilterSummary";
import { GameList } from "./GameList";
import { StateMessage } from "./StateMessage";

type Props = { meta: ScoreboardMeta; filters: Filters };

/** Loads the selected week and renders the summary row plus table (or empty/error state). */
export async function ScoreboardResults({ meta, filters }: Props) {
  const result = await attempt(() => loadWeekData(meta));
  if (!result.ok) {
    return (
      <>
        <FilterSummary count={0} filters={filters} />
        <StateMessage
          variant="error"
          title="Couldn't load games"
          message={result.message}
        />
      </>
    );
  }

  const { games, stats } = result.data;
  const shown = filterGames(games, meta.teams, filters);

  return (
    <>
      <FilterSummary count={shown.length} filters={filters} />
      {shown.length === 0 ? (
        hasActiveFilters(filters) ? (
          <StateMessage
            variant="empty"
            title="No games match these filters"
            message="Try another team or clear your conference and ranking filters."
            action={{ href: clearFiltersHref(filters), label: "Clear filters" }}
          />
        ) : (
          <StateMessage
            variant="empty"
            title="No games this week"
            message="There are no FBS games scheduled for the selected week."
          />
        )
      ) : (
        <GameList
          groups={groupByDay(shown)}
          teams={teamsFor(shown, meta.teams)}
          stats={Object.fromEntries(
            shown.map((g) => [g.id, stats[g.id]]).filter(([, s]) => s),
          )}
        />
      )}
    </>
  );
}

/** Only ship the teams that appear in the shown games to the client. */
function teamsFor(
  games: { home: { teamId: number }; away: { teamId: number } }[],
  all: Record<number, Team>,
): Record<number, Team> {
  const out: Record<number, Team> = {};
  for (const g of games) {
    for (const id of [g.home.teamId, g.away.teamId]) {
      if (all[id]) out[id] = all[id];
    }
  }
  return out;
}
