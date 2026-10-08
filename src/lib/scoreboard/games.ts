import type { GameRow, Team } from "../cfbd/models";
import { isTop25Game } from "../cfbd/normalize";
import { teamMatches } from "../utils/search";
import { etDayKey, formatEtDayHeading } from "../utils/time";
import type { Filters } from "./params";

export type DayGroup = { key: string; heading: string; games: GameRow[] };

/** Conference, Top 25 and team-search filters. Either team in a game can match. */
export function filterGames(
  games: GameRow[],
  teams: Record<number, Team>,
  f: Pick<Filters, "conf" | "top25" | "q">,
): GameRow[] {
  return games.filter((g) => {
    const home = teams[g.home.teamId];
    const away = teams[g.away.teamId];
    if (f.conf && home?.conference !== f.conf && away?.conference !== f.conf)
      return false;
    if (f.top25 && !isTop25Game(g)) return false;
    if (
      f.q.trim() &&
      !(home && teamMatches(home, f.q)) &&
      !(away && teamMatches(away, f.q))
    ) {
      return false;
    }
    return true;
  });
}

/** Groups by Eastern-time day, ordered by kickoff. */
export function groupByDay(games: GameRow[]): DayGroup[] {
  const sorted = [...games].sort(
    (a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc) || a.id - b.id,
  );
  const groups = new Map<string, DayGroup>();
  for (const g of sorted) {
    const key = etDayKey(g.startUtc);
    const group = groups.get(key) ?? {
      key,
      heading: formatEtDayHeading(g.startUtc),
      games: [],
    };
    group.games.push(g);
    groups.set(key, group);
  }
  return [...groups.values()];
}
