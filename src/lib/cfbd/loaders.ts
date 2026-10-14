import { unstable_cache } from "next/cache";
import { REVALIDATE, type WeekQuery } from "./config";
import {
  fetchAdvancedGameStats,
  fetchCalendar,
  fetchCoaches,
  fetchGameTeamStats,
  fetchGames,
  fetchPlayerSearch,
  fetchPlayerUsage,
  fetchPpaPlayerGames,
  fetchPpaPlayerSeason,
  fetchRoster,
  fetchTeamGames,
  fetchTeamPpaGames,
  fetchTeamRecord,
  fetchTeamPlayerStats,
  fetchPlayerSeasonStats,
  fetchLines,
  fetchRankings,
  fetchRecords,
  fetchScoreboard,
  fetchSeasonAdvancedStats,
  fetchSeasonGames,
  fetchSeasonStats,
  fetchSpRatings,
  fetchTeamsFbs,
} from "./endpoints";
import type {
  GameRow,
  PlayerBio,
  RosterPlayer,
  ScheduleRow,
  TeamGamePpa,
  TeamLeader,
  TeamRecord,
  PlayerGameLog,
  PlayerStint,
  SituationSplits,
  Team,
  TeamGameStats,
} from "./models";
import type { PlayerCategoryStats } from "./normalize";
import {
  apRankMap,
  activeSeasons,
  buildPlayerBio,
  buildPlayerRows,
  buildTeamSeasonRows,
  headCoach,
  conferencesOf,
  currentWeek,
  normalizeGame,
  normalizeRoster,
  normalizeSchedule,
  normalizeTeamPpaGames,
  normalizeTeamRecord,
  teamLeaders,
  playerCategoryStats,
  playerGameLog,
  playerPpa,
  playerStints,
  playerUsage,
  primaryCategory,
  teamForSeason,
  normalizeScoreboardGame,
  normalizeTeamGameStats,
  normalizeTeams,
  spreadByGame,
  totalByGame,
} from "./normalize";
import {
  CATEGORY_BY_ID,
  type PlayerCategory,
  type PlayerCategoryId,
} from "../players/categories";
import type { RawCalendarWeek } from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Season year for a date: Jan-Jun still belongs to the previous season. */
export function seasonOf(now: Date): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

/** URL value for a calendar week: "6" for regular weeks, "p1" for postseason. */
export function weekValue(w: { seasonType: string; week: number }): string {
  return w.seasonType === "postseason" ? `p${w.week}` : String(w.week);
}

export type WeekOption = {
  value: string;
  label: string;
  query: WeekQuery;
  startMs: number;
  endMs: number;
};

export type ScoreboardMeta = {
  season: number;
  weeks: WeekOption[];
  selected: WeekOption;
  /** True when the selected week is happening now, so the live scoreboard endpoint applies. */
  isCurrent: boolean;
  /** True once the week ended long enough ago to cache permanently. */
  isPast: boolean;
  teams: Record<number, Team>;
  conferences: string[];
};

function weekOptions(calendar: RawCalendarWeek[]): WeekOption[] {
  const postCount = calendar.filter(
    (w) => w.seasonType === "postseason",
  ).length;
  return calendar.map((w) => ({
    value: weekValue(w),
    label:
      w.seasonType === "postseason"
        ? postCount > 1
          ? `Postseason ${w.week}`
          : "Postseason"
        : `Week ${w.week}`,
    query: {
      year: w.season,
      week: w.week,
      seasonType: w.seasonType === "postseason" ? "postseason" : "regular",
    },
    startMs: Date.parse(w.startDate),
    endMs: Date.parse(w.endDate),
  }));
}

/** Calendar and teams only (both cached 24h): enough to draw the header and filter bar. */
export async function loadMeta(
  sel: { season: number | null; week: string | null },
  now = new Date(),
): Promise<ScoreboardMeta> {
  const currentSeason = seasonOf(now);
  const season = sel.season ?? currentSeason;
  const isOldSeason = season < currentSeason;

  const [calendar, teamsRaw] = await Promise.all([
    fetchCalendar(season, { isPast: isOldSeason }),
    fetchTeamsFbs(season, { isPast: isOldSeason }),
  ]);
  const weeks = weekOptions(calendar);
  if (weeks.length === 0)
    throw new Error(`CFBD returned no calendar for ${season}`);

  const cur = season === currentSeason ? currentWeek(calendar, now) : null;
  const byValue = (v: string | null) => weeks.find((w) => w.value === v);
  const selected =
    byValue(sel.week) ??
    (cur &&
      byValue(weekValue({ seasonType: cur.seasonType, week: cur.week }))) ??
    weeks[0];

  const t = now.getTime();
  const teams = normalizeTeams(teamsRaw);
  return {
    season,
    weeks,
    selected,
    isCurrent:
      season === currentSeason && selected.startMs <= t && t < selected.endMs,
    isPast: t > selected.endMs + 2 * DAY_MS,
    teams: Object.fromEntries(teams.map((x) => [x.id, x])),
    conferences: conferencesOf(teams),
  };
}

export type WeekData = {
  games: GameRow[];
  /** Stats by game id. Missing for games that have not started. */
  stats: Record<number, TeamGameStats[]>;
  unmatchedStats: { gameId: number; team: string }[];
  /** Week the AP poll came from (it can lag the selected week), or null if none found. */
  rankingsWeek: number | null;
};

/** Selected week's games, rankings and stats: 5-6 calls, all batched per week. */
export async function loadWeekData(meta: ScoreboardMeta): Promise<WeekData> {
  const q = meta.selected.query;
  const past = { isPast: meta.isPast };

  const gamesPart = meta.isCurrent
    ? fetchScoreboard().then((g) => ({
        scoreboard: g,
        games: null,
        lines: null,
      }))
    : Promise.all([fetchGames(q, past), fetchLines(q, past)]).then(
        ([games, lines]) => ({
          scoreboard: null,
          games,
          lines,
        }),
      );

  const [part, gameTeams, advanced, ranking] = await Promise.all([
    gamesPart,
    fetchGameTeamStats(q, past),
    fetchAdvancedGameStats(q, past),
    loadRanks(q, past),
  ]);

  const { stats, unmatched } = normalizeTeamGameStats(gameTeams, advanced);
  const spreads = part.lines
    ? spreadByGame(part.lines)
    : new Map<number, number>();
  const totals = part.lines
    ? totalByGame(part.lines)
    : new Map<number, number>();
  const games = part.scoreboard
    ? part.scoreboard.map((g) => normalizeScoreboardGame(g, ranking.ranks))
    : (part.games ?? []).map((g) =>
        normalizeGame(g, ranking.ranks, spreads, totals),
      );

  return {
    games,
    stats: Object.fromEntries(
      [...Map.groupBy(stats, (s) => s.gameId)].map(([id, rows]) => [id, rows]),
    ),
    unmatchedStats: unmatched,
    rankingsWeek: ranking.week,
  };
}

/** The AP poll for a week is released after it starts, so fall back one week if empty. */
export async function loadRanks(q: WeekQuery, past: { isPast: boolean }) {
  const ranks = apRankMap(await fetchRankings(q, past));
  if (ranks.size > 0) return { ranks, week: q.week };
  if (q.week > 1 && q.seasonType === "regular") {
    const prev = { ...q, week: q.week - 1 };
    const prevRanks = apRankMap(await fetchRankings(prev, { isPast: true }));
    if (prevRanks.size > 0) return { ranks: prevRanks, week: prev.week };
  }
  return { ranks, week: null as number | null };
}

export type TeamsIndex = {
  season: number;
  currentSeason: number;
  isPast: boolean;
  teams: Team[];
  conferences: string[];
};

/** Teams and conferences for a season (1 call, cached 24h): enough to draw the filter bar. */
export async function loadTeamsIndex(
  season: number | null,
  now = new Date(),
): Promise<TeamsIndex> {
  const currentSeason = seasonOf(now);
  const year = season ?? currentSeason;
  const isPast = year < currentSeason;
  const teams = normalizeTeams(await fetchTeamsFbs(year, { isPast }));
  return {
    season: year,
    currentSeason,
    isPast,
    teams,
    conferences: conferencesOf(teams),
  };
}

/** Season stats for every team: SP+, advanced, season stats, records, games (5 calls, cached 24h). */
export async function loadTeamRows(index: TeamsIndex) {
  const past = { isPast: index.isPast };
  const [sp, advanced, seasonStats, records, games] = await Promise.all([
    fetchSpRatings(index.season, past),
    fetchSeasonAdvancedStats(index.season, past),
    fetchSeasonStats(index.season, past),
    fetchRecords(index.season, past),
    fetchSeasonGames(index.season, past),
  ]);
  const result = buildTeamSeasonRows({
    teams: index.teams,
    sp,
    advanced,
    seasonStats,
    records,
    games,
  });
  if (result.unmatched.length > 0) {
    console.warn(
      `[cfbd] ${result.unmatched.length} team/source joins unmatched`,
      result.unmatched.slice(0, 5),
    );
  }
  return result.rows;
}

/**
 * One category for every FBS player. The raw response is 0.4-12MB (too big for Next's fetch
 * cache), so the small normalized FBS result is cached instead, 24h (a year for past seasons).
 */
const cachedPlayerRows = (
  season: number,
  categoryId: PlayerCategoryId,
  isPast: boolean,
) =>
  unstable_cache(
    async () => {
      const category = CATEGORY_BY_ID.get(categoryId);
      if (!category) throw new Error(`Unknown player category: ${categoryId}`);
      const past = { isPast };
      const [teamsRaw, records, raw] = await Promise.all([
        fetchTeamsFbs(season, past),
        fetchRecords(season, past),
        fetchPlayerSeasonStats({ year: season, category: categoryId }),
      ]);
      const teamGames = new Map(
        records.map((r) => [r.teamId, r.total.games ?? 0]),
      );
      return buildPlayerRows(raw, normalizeTeams(teamsRaw), category, teamGames)
        .rows;
    },
    ["player-rows", String(season), categoryId],
    { revalidate: isPast ? REVALIDATE.permanent : REVALIDATE.daily },
  )();

export function loadPlayerRows(
  index: Pick<TeamsIndex, "season" | "isPast">,
  category: PlayerCategory,
) {
  return cachedPlayerRows(index.season, category.id, index.isPast);
}

export type PlayerProfile = {
  season: number;
  currentSeason: number;
  /** Every season the player was active, oldest first. */
  seasons: number[];
  stints: PlayerStint[];
  bio: PlayerBio;
  /** Team in the selected season, if it is an FBS team we know. */
  team: Team | null;
  teamName: string;
  categories: PlayerCategoryStats[];
  primary: PlayerCategoryId | null;
  usage: SituationSplits | null;
  ppa: SituationSplits | null;
  games: PlayerGameLog[];
};

export type PlayerProfileResult =
  { kind: "ok"; profile: PlayerProfile } | { kind: "not-found" };

/**
 * Everything for one player's page: bio, stats, usage, PPA and game log. About 6 calls, each
 * 150-900ms and cached 24h. `team` is optional: when absent it comes from the player's career.
 */
export async function loadPlayerProfile(
  q: { id: string; name: string; team: string | null; season: number | null },
  now = new Date(),
): Promise<PlayerProfileResult> {
  const currentSeason = seasonOf(now);
  const search = q.name
    ? (await fetchPlayerSearch(q.name, { isPast: false })).find(
        (p) => p.id === q.id,
      )
    : undefined;
  const stints = playerStints(search);

  const seasons = activeSeasons(stints, currentSeason);
  const wanted = q.season ?? currentSeason;
  const season = seasons.includes(wanted) ? wanted : (seasons.at(-1) ?? wanted);
  const teamName = teamForSeason(stints, season) ?? q.team;
  if (!teamName) return { kind: "not-found" };

  const past = { isPast: season < currentSeason };
  const [roster, teamStats, ppa, usage, games, teamsRaw] = await Promise.all([
    fetchRoster({ team: teamName, year: season }, past),
    fetchTeamPlayerStats({ year: season, team: teamName }, past),
    fetchPpaPlayerSeason({ year: season, playerId: q.id }, past),
    fetchPlayerUsage({ year: season, playerId: q.id }, past),
    fetchPpaPlayerGames({ year: season, team: teamName, playerId: q.id }, past),
    fetchTeamsFbs(season, past),
  ]);

  const categories = playerCategoryStats(teamStats, q.id);
  const bio = buildPlayerBio(
    q.id,
    roster.find((p) => p.id === q.id),
    search,
  );
  if (!bio || (categories.length === 0 && !bio.name))
    return { kind: "not-found" };

  return {
    kind: "ok",
    profile: {
      season,
      currentSeason,
      seasons: seasons.length > 0 ? seasons : [season],
      stints,
      bio,
      team: normalizeTeams(teamsRaw).find((t) => t.school === teamName) ?? null,
      teamName,
      categories,
      primary: primaryCategory(
        bio.position,
        categories.map((c) => c.category),
      ),
      usage: playerUsage(usage, q.id),
      ppa: playerPpa(ppa, q.id),
      games: playerGameLog(games, q.id),
    },
  };
}

export type CareerRow = {
  season: number;
  team: string;
  stats: Record<string, number> | null;
};

/** One row per active season for the player's primary category (one cached team slice each). */
export async function loadCareer(profile: PlayerProfile): Promise<CareerRow[]> {
  const primary = profile.primary;
  if (!primary) return [];
  return Promise.all(
    profile.seasons.map(async (season): Promise<CareerRow> => {
      const team = teamForSeason(profile.stints, season) ?? profile.teamName;
      const rows = await fetchTeamPlayerStats(
        { year: season, team },
        { isPast: season < profile.currentSeason },
      );
      const found = playerCategoryStats(rows, profile.bio.id).find(
        (c) => c.category === primary,
      );
      return { season, team, stats: found?.stats ?? null };
    }),
  );
}

export type TeamProfile = {
  index: TeamsIndex;
  team: Team;
  season: number;
  record: TeamRecord;
  coach: string | null;
  schedule: ScheduleRow[];
  ppaGames: TeamGamePpa[];
  roster: RosterPlayer[];
  leaders: TeamLeader[];
};

export type TeamProfileResult =
  { kind: "ok"; profile: TeamProfile } | { kind: "not-found" };

/**
 * Everything for one team's page except the national ranks: teams index (1 call, shared) plus
 * games, record, coach, per-game PPA, roster and the team's player stats (6 calls, 70-440ms each).
 */
export async function loadTeamProfile(
  q: { id: number; season: number | null },
  now = new Date(),
): Promise<TeamProfileResult> {
  const index = await loadTeamsIndex(q.season, now);
  const team = index.teams.find((t) => t.id === q.id);
  if (!team) return { kind: "not-found" };

  const args = { year: index.season, team: team.school };
  const past = { isPast: index.isPast };
  const [games, records, coaches, ppa, roster, playerStats] = await Promise.all(
    [
      fetchTeamGames(args, past),
      fetchTeamRecord(args, past),
      fetchCoaches(args, past),
      fetchTeamPpaGames(args, past),
      fetchRoster(args, past),
      fetchTeamPlayerStats(args, past),
    ],
  );

  return {
    kind: "ok",
    profile: {
      index,
      team,
      season: index.season,
      record: normalizeTeamRecord(records, team.id),
      coach: headCoach(coaches, team.school, index.season),
      schedule: normalizeSchedule(games, team.id),
      ppaGames: normalizeTeamPpaGames(ppa),
      roster: normalizeRoster(roster),
      leaders: teamLeaders(playerStats),
    },
  };
}

/** A team's AP rank in the latest poll for the season (this week's, falling back a week), or null. */
export async function loadApRank(
  index: TeamsIndex,
  teamId: number,
  now = new Date(),
) {
  const calendar = await fetchCalendar(index.season, { isPast: index.isPast });
  const regular = calendar.filter((w) => w.seasonType === "regular");
  const target = index.isPast
    ? regular.at(-1)
    : (currentWeek(calendar, now) ?? undefined);
  if (!target) return null;
  const week: WeekQuery = {
    year: index.season,
    week: target.week,
    seasonType: target.seasonType === "postseason" ? "postseason" : "regular",
  };
  const { ranks } = await loadRanks(week, { isPast: index.isPast });
  return ranks.get(teamId) ?? null;
}
