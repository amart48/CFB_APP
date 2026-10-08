import type { SeasonType } from "./config";
import {
  fetchGameById,
  fetchGameDrives,
  fetchGameLines,
  fetchGamePlayers,
  fetchGameSliceAdvanced,
  fetchGameSliceTeams,
  fetchScoreboard,
} from "./endpoints";
import { CfbdError } from "./errors";
import { loadRanks, loadTeamsIndex } from "./loaders";
import type { BoxScore } from "./models";
import {
  fallbackTeam,
  normalizeBoxGame,
  normalizeBoxLine,
  normalizeBoxPlayers,
  normalizeScoringPlays,
  normalizeTeamGameStats,
  withOpponentRows,
} from "./normalize";
import type { RawGame, RawScoreboardGame } from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One game by id (1 small call, no year needed). Null when CFBD does not know the id, or rejects
 * it as malformed (400), so both render the same "Game not found" state.
 */
export async function loadGame(id: number): Promise<RawGame | null> {
  try {
    return (await fetchGameById(id))[0] ?? null;
  } catch (e) {
    if (e instanceof CfbdError && e.kind === "http" && e.status === 400) {
      return null;
    }
    throw e;
  }
}

/** The live scoreboard only covers the current week, so only unfinished nearby games need it. */
async function scoreboardEntry(
  g: RawGame,
  now: Date,
): Promise<RawScoreboardGame | undefined> {
  if (g.completed) return undefined;
  if (Math.abs(now.getTime() - Date.parse(g.startDate)) > 4 * DAY_MS) {
    return undefined;
  }
  try {
    return (await fetchScoreboard()).find((s) => s.id === g.id);
  } catch (e) {
    // The page still works from /games; only the live clock and TV are lost.
    console.warn("[cfbd] scoreboard unavailable for box score", String(e));
    return undefined;
  }
}

async function ranksFor(
  q: { year: number; week: number; seasonType: SeasonType },
  isPast: boolean,
) {
  try {
    return (await loadRanks(q, { isPast })).ranks;
  } catch (e) {
    console.warn("[cfbd] rankings unavailable for box score", String(e));
    return new Map<number, number>();
  }
}

/**
 * Everything on the game page: 6 unique CFBD calls (game by id, team stats, players, drives,
 * advanced stats, lines; each 2-30 KB so the normal fetch cache applies) plus the shared teams,
 * rankings and, for unfinished games, scoreboard calls. All slices are week + home team.
 */
export async function loadBoxScore(
  raw: RawGame,
  now = new Date(),
): Promise<BoxScore> {
  const seasonType: SeasonType =
    raw.seasonType === "postseason" ? "postseason" : "regular";
  const q = { year: raw.season, week: raw.week, seasonType };
  const slice = { ...q, team: raw.homeTeam };
  const isPast =
    raw.completed && now.getTime() - Date.parse(raw.startDate) > 2 * DAY_MS;
  const past = { isPast };

  const [index, gameTeams, players, drives, advanced, lines, sb, ranks] =
    await Promise.all([
      loadTeamsIndex(raw.season, now),
      fetchGameSliceTeams(slice, past),
      fetchGamePlayers(slice, past),
      fetchGameDrives(slice, past),
      fetchGameSliceAdvanced(slice, past),
      fetchGameLines(raw.id, raw.season, past),
      scoreboardEntry(raw, now),
      ranksFor(q, isPast),
    ]);

  const line = normalizeBoxLine(lines);
  const game = normalizeBoxGame(raw, sb, ranks, line?.spreadHome ?? null, now);
  const { stats } = normalizeTeamGameStats(
    gameTeams,
    withOpponentRows(advanced),
  );
  const byTeam = new Map(
    stats.filter((s) => s.gameId === raw.id).map((s) => [s.teamId, s]),
  );
  const teams = new Map(index.teams.map((t) => [t.id, t]));
  const playersGame = players.find((p) => p.id === raw.id);

  return {
    game,
    attendance: raw.attendance ?? null,
    away:
      teams.get(raw.awayId) ??
      fallbackTeam(raw.awayId, raw.awayTeam, raw.awayConference),
    home:
      teams.get(raw.homeId) ??
      fallbackTeam(raw.homeId, raw.homeTeam, raw.homeConference),
    fbs: { away: teams.has(raw.awayId), home: teams.has(raw.homeId) },
    awayStats: byTeam.get(raw.awayId) ?? null,
    homeStats: byTeam.get(raw.homeId) ?? null,
    awayPlayers: normalizeBoxPlayers(playersGame, "away", raw.awayTeam),
    homePlayers: normalizeBoxPlayers(playersGame, "home", raw.homeTeam),
    scoring: normalizeScoringPlays(drives, {
      id: raw.id,
      homeTeam: raw.homeTeam,
      homePoints: game.home.points,
      awayPoints: game.away.points,
    }),
    line,
  };
}
