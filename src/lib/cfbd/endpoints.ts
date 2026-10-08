import { REVALIDATE, type WeekQuery } from "./config";
import { cfbdGet } from "./http";
import {
  advancedResponse,
  calendarResponse,
  coachesResponse,
  drivesResponse,
  gamePlayersResponse,
  gameTeamsResponse,
  gamesResponse,
  linesResponse,
  playerSearchResponse,
  playerStatsResponse,
  playerUsageResponse,
  ppaPlayerGamesResponse,
  ppaTeamGamesResponse,
  ppaPlayerSeasonResponse,
  rosterResponse,
  rankingsResponse,
  recordsResponse,
  scoreboardResponse,
  seasonAdvancedResponse,
  seasonStatsResponse,
  spRatingsResponse,
  teamsResponse,
} from "./schemas";

/**
 * Raw endpoint functions. `isPast` selects the cache window: past weeks and
 * seasons are cached for a year, the current week for minutes.
 * Normalization into our own models happens elsewhere.
 */
type Past = { isPast: boolean };

const weekWindow = ({ isPast }: Past) =>
  isPast ? REVALIDATE.permanent : REVALIDATE.liveWeek;
const dailyWindow = ({ isPast }: Past) =>
  isPast ? REVALIDATE.permanent : REVALIDATE.daily;

export function fetchTeamsFbs(year: number, past: Past) {
  return cfbdGet("/teams/fbs", {
    params: { year },
    schema: teamsResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchCalendar(year: number, past: Past) {
  return cfbdGet("/calendar", {
    params: { year },
    schema: calendarResponse,
    revalidate: dailyWindow(past),
  });
}

/** Rolling window of the CURRENT week only. Ignores year/week params. */
export function fetchScoreboard() {
  return cfbdGet("/scoreboard", {
    params: { classification: "fbs" },
    schema: scoreboardResponse,
    revalidate: REVALIDATE.liveWeek,
  });
}

export function fetchGames(q: WeekQuery, past: Past) {
  return cfbdGet("/games", {
    params: { ...q, classification: "fbs" },
    schema: gamesResponse,
    revalidate: weekWindow(past),
  });
}

export function fetchLines(q: WeekQuery, past: Past) {
  return cfbdGet("/lines", {
    params: { ...q },
    schema: linesResponse,
    revalidate: weekWindow(past),
  });
}

export function fetchRankings(q: WeekQuery, past: Past) {
  return cfbdGet("/rankings", {
    params: { ...q },
    schema: rankingsResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchGameTeamStats(q: WeekQuery, past: Past) {
  return cfbdGet("/games/teams", {
    params: { ...q },
    schema: gameTeamsResponse,
    revalidate: weekWindow(past),
  });
}

export function fetchAdvancedGameStats(q: WeekQuery, past: Past) {
  return cfbdGet("/stats/game/advanced", {
    params: { ...q },
    schema: advancedResponse,
    revalidate: weekWindow(past),
  });
}

/**
 * Box score calls. `/games/teams`, `/games/players`, `/drives` and `/stats/game/advanced` reject
 * (or ignore) a bare `gameId`, so a game is fetched as a week + team slice: one small response
 * (2-30 KB, 100-250 ms) that holds both teams of that game. Never call them without `team`.
 */
export type GameSlice = WeekQuery & { team: string };

/** One game by id. Works without a year; returns [] for an unknown id. */
export function fetchGameById(id: number) {
  return cfbdGet("/games", {
    params: { id },
    schema: gamesResponse,
    revalidate: REVALIDATE.liveWeek,
  });
}

export function fetchGameSliceTeams(s: GameSlice, past: Past) {
  return cfbdGet("/games/teams", {
    params: { ...s },
    schema: gameTeamsResponse,
    revalidate: weekWindow(past),
  });
}

export function fetchGamePlayers(s: GameSlice, past: Past) {
  return cfbdGet("/games/players", {
    params: { ...s },
    schema: gamePlayersResponse,
    revalidate: weekWindow(past),
  });
}

export function fetchGameDrives(s: GameSlice, past: Past) {
  return cfbdGet("/drives", {
    params: { ...s },
    schema: drivesResponse,
    revalidate: weekWindow(past),
  });
}

/** Only the slice team's row comes back; the opponent's offense is that row's `defense` block. */
export function fetchGameSliceAdvanced(s: GameSlice, past: Past) {
  return cfbdGet("/stats/game/advanced", {
    params: { ...s },
    schema: advancedResponse,
    revalidate: weekWindow(past),
  });
}

export function fetchGameLines(gameId: number, year: number, past: Past) {
  return cfbdGet("/lines", {
    params: { gameId, year },
    schema: linesResponse,
    revalidate: weekWindow(past),
  });
}

/** Season-level calls for the Team Season Stats table. Past seasons cache for a year, else 24h. */

/** SP+ ratings. Includes a "nationalAverages" row that the normalizer must drop. */
export function fetchSpRatings(year: number, past: Past) {
  return cfbdGet("/ratings/sp", {
    params: { year },
    schema: spRatingsResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchSeasonAdvancedStats(year: number, past: Past) {
  return cfbdGet("/stats/season/advanced", {
    params: { year },
    schema: seasonAdvancedResponse,
    revalidate: dailyWindow(past),
  });
}

/** About 8,600 rows (one per team per stat); stays under Next's 2MB fetch-cache limit. */
export function fetchSeasonStats(year: number, past: Past) {
  return cfbdGet("/stats/season", {
    params: { year },
    schema: seasonStatsResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchRecords(year: number, past: Past) {
  return cfbdGet("/records", {
    params: { year },
    schema: recordsResponse,
    revalidate: dailyWindow(past),
  });
}

/** Every FBS game of the regular season (no week), used to total points for/against. */
export function fetchSeasonGames(year: number, past: Past) {
  return cfbdGet("/games", {
    params: { year, seasonType: "regular", classification: "fbs" },
    schema: gamesResponse,
    revalidate: dailyWindow(past),
  });
}

/**
 * One whole category for every division (FBS rows are picked out by team name afterwards).
 * Sizes: 0.4-1MB for passing, interceptions, kicking, punting and returns; 2.3MB rushing,
 * 3.2MB receiving, 12MB defensive. The larger ones exceed Next's 2MB fetch-cache limit, so this
 * is never fetch-cached: callers cache the normalized FBS rows instead. Each call takes 4-8s.
 */
export function fetchPlayerSeasonStats(q: { year: number; category: string }) {
  return cfbdGet("/stats/player/season", {
    params: { ...q },
    schema: playerStatsResponse,
    revalidate: 0,
    noStore: true,
  });
}

/** Individual player page. Everything here is fast (150-900ms) and fetch-cacheable. */

export function fetchRoster(q: { team: string; year: number }, past: Past) {
  return cfbdGet("/roster", {
    params: { ...q },
    schema: rosterResponse,
    revalidate: dailyWindow(past),
  });
}

/** Search by name; returns career team stints. */
export function fetchPlayerSearch(searchTerm: string, past: Past) {
  return cfbdGet("/player/search", {
    params: { searchTerm },
    schema: playerSearchResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchPpaPlayerSeason(
  q: { year: number; playerId: string },
  past: Past,
) {
  return cfbdGet("/ppa/players/season", {
    params: { ...q },
    schema: ppaPlayerSeasonResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchPlayerUsage(
  q: { year: number; playerId: string },
  past: Past,
) {
  return cfbdGet("/player/usage", {
    params: { ...q },
    schema: playerUsageResponse,
    revalidate: dailyWindow(past),
  });
}

/** Per-game PPA. CFBD requires `team` (or `week`) alongside `playerId`. */
export function fetchPpaPlayerGames(
  q: { year: number; team: string; playerId: string },
  past: Past,
) {
  return cfbdGet("/ppa/players/games", {
    params: { ...q },
    schema: ppaPlayerGamesResponse,
    revalidate: weekWindow(past),
  });
}

/**
 * Every player on one team, all categories (about 70-110KB, under the 2MB cache limit).
 * `/stats/player/season` has no playerId filter, so the page filters this slice by id.
 */
export function fetchTeamPlayerStats(
  q: { year: number; team: string },
  past: Past,
) {
  return cfbdGet("/stats/player/season", {
    params: { ...q },
    schema: playerStatsResponse,
    revalidate: dailyWindow(past),
  });
}

/** Team page. All fast (70-440ms) and fetch-cacheable. */

/** A team's full schedule for a season (no week), played and upcoming. */
export function fetchTeamGames(q: { year: number; team: string }, past: Past) {
  return cfbdGet("/games", {
    params: { ...q },
    schema: gamesResponse,
    revalidate: weekWindow(past),
  });
}

/** One team's record with conference, home and away splits plus expected wins. */
export function fetchTeamRecord(q: { year: number; team: string }, past: Past) {
  return cfbdGet("/records", {
    params: { ...q },
    schema: recordsResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchCoaches(q: { year: number; team: string }, past: Past) {
  return cfbdGet("/coaches", {
    params: { ...q },
    schema: coachesResponse,
    revalidate: dailyWindow(past),
  });
}

export function fetchTeamPpaGames(
  q: { year: number; team: string },
  past: Past,
) {
  return cfbdGet("/ppa/games", {
    params: { ...q },
    schema: ppaTeamGamesResponse,
    revalidate: weekWindow(past),
  });
}
