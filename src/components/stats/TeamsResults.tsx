import { StateBody } from "@/components/scoreboard/StateMessage";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamRows, type TeamsIndex } from "@/lib/cfbd/loaders";
import { filterTeamRows, type TeamFilters } from "@/lib/teams/params";
import { TeamsTableFrame } from "./TeamsTableFrame";
import { TeamsView } from "./TeamsView";

/** Loads season stats for every team, then renders the sortable table (or an error state). */
export async function TeamsResults({
  index,
  filters,
}: {
  index: TeamsIndex;
  filters: TeamFilters;
}) {
  const result = await attempt(() => loadTeamRows(index));
  if (!result.ok) {
    return (
      <TeamsTableFrame sort={filters.sort}>
        <tr>
          <td colSpan={16}>
            <StateBody
              variant="error"
              title="Couldn't load team stats"
              message={result.message}
            />
          </td>
        </tr>
      </TeamsTableFrame>
    );
  }
  return (
    <TeamsView
      rows={filterTeamRows(result.data, filters)}
      filters={{ conf: filters.conf, q: filters.q }}
      initialSort={filters.sort}
      season={index.season === index.currentSeason ? null : index.season}
    />
  );
}
