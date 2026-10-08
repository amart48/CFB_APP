import { z } from "zod";

/** Raw CFBD response shapes. Only fields we use; unknown fields are stripped. */
const num = z.number().nullish();
const str = z.string().nullish();

export const teamSchema = z.object({
  id: z.number(),
  school: z.string(),
  mascot: str,
  abbreviation: str,
  alternateNames: z.array(z.string()).nullish(),
  conference: str,
  classification: str,
  color: str,
  alternateColor: str,
  location: z
    .object({ name: str, city: str, state: str, capacity: num })
    .nullish(),
});

export const calendarWeekSchema = z.object({
  season: z.number(),
  week: z.number(),
  seasonType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

const scoreboardTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  conference: str,
  points: num,
  lineScores: z.array(z.number()).nullish(),
  winProbability: num,
});

export const scoreboardGameSchema = z.object({
  id: z.number(),
  startDate: z.string(),
  startTimeTBD: z.boolean().nullish(),
  // Live value is not yet verified, so keep this a free string.
  status: z.string(),
  period: num,
  clock: str,
  situation: str,
  tv: str,
  neutralSite: z.boolean().nullish(),
  conferenceGame: z.boolean().nullish(),
  venue: z.object({ name: str, city: str, state: str }).nullish(),
  homeTeam: scoreboardTeamSchema,
  awayTeam: scoreboardTeamSchema,
  betting: z
    .object({
      spread: num,
      overUnder: num,
      homeMoneyline: num,
      awayMoneyline: num,
    })
    .nullish(),
});

export const gameSchema = z.object({
  id: z.number(),
  season: z.number(),
  week: z.number(),
  seasonType: z.string(),
  startDate: z.string(),
  startTimeTBD: z.boolean().nullish(),
  completed: z.boolean(),
  neutralSite: z.boolean().nullish(),
  conferenceGame: z.boolean().nullish(),
  venue: str,
  attendance: num,
  homeId: z.number(),
  homeTeam: z.string(),
  homeConference: str,
  homePoints: num,
  homeLineScores: z.array(z.number()).nullish(),
  homePregameElo: num,
  awayId: z.number(),
  awayTeam: z.string(),
  awayConference: str,
  awayPoints: num,
  awayLineScores: z.array(z.number()).nullish(),
  awayPregameElo: num,
});

export const gameLinesSchema = z.object({
  id: z.number(),
  homeTeamId: z.number(),
  awayTeamId: z.number(),
  lines: z.array(
    z.object({
      provider: z.string(),
      spread: num,
      formattedSpread: str,
      spreadOpen: num,
      overUnder: num,
      homeMoneyline: num,
      awayMoneyline: num,
    }),
  ),
});

export const rankingWeekSchema = z.object({
  season: z.number(),
  week: z.number(),
  seasonType: z.string(),
  polls: z.array(
    z.object({
      poll: z.string(),
      ranks: z.array(
        z.object({
          rank: z.number(),
          teamId: num,
          school: z.string(),
        }),
      ),
    }),
  ),
});

export const gameTeamsSchema = z.object({
  id: z.number(),
  teams: z.array(
    z.object({
      teamId: z.number(),
      team: z.string(),
      homeAway: str,
      points: num,
      // All stat values are strings in CFBD ("6-9", "34:41", "352").
      stats: z.array(z.object({ category: z.string(), stat: str })),
    }),
  ),
});

const advancedSideSchema = z.object({
  plays: num,
  drives: num,
  ppa: num,
  successRate: num,
  explosiveness: num,
  powerSuccess: num,
  stuffRate: num,
  lineYards: num,
});

export const advancedGameStatsSchema = z.object({
  gameId: z.number(),
  team: z.string(),
  opponent: z.string(),
  offense: advancedSideSchema,
  defense: advancedSideSchema,
});

/** /ratings/sp. Keyed by team NAME (matches /teams/fbs school). Includes a stray "nationalAverages" row with no conference. */
const spSideSchema = z.object({ ranking: num, rating: num });
export const spRatingSchema = z.object({
  year: num,
  team: z.string(),
  conference: str,
  rating: num,
  ranking: num,
  offense: spSideSchema,
  defense: spSideSchema,
});

/** /stats/season/advanced. Keyed by team NAME. */
const seasonAdvancedSideSchema = z.object({
  plays: num,
  ppa: num,
  successRate: num,
  explosiveness: num,
});
export const seasonAdvancedSchema = z.object({
  season: num,
  team: z.string(),
  conference: str,
  offense: seasonAdvancedSideSchema,
  defense: seasonAdvancedSideSchema,
});

/** /stats/season: one row per team per stat (statName like "totalYards", "totalYardsOpponent", "games"). */
export const seasonStatSchema = z.object({
  team: z.string(),
  statName: z.string(),
  statValue: z.number(),
});

/** /records: keyed by team id. */
const recordTotalSchema = z.object({
  games: num,
  wins: num,
  losses: num,
  ties: num,
});
export const recordSchema = z.object({
  year: num,
  teamId: z.number(),
  team: z.string(),
  total: recordTotalSchema,
  conferenceGames: recordTotalSchema.nullish(),
  homeGames: recordTotalSchema.nullish(),
  awayGames: recordTotalSchema.nullish(),
  expectedWins: num,
});

/** /stats/player/season: one row per player per stat. Values are strings ("0.755", "1049"). */
export const playerStatSchema = z.object({
  season: num,
  playerId: z.union([z.string(), z.number()]).transform(String),
  player: z.string(),
  position: str,
  team: z.string(),
  conference: str,
  category: z.string(),
  statType: z.string(),
  stat: z.union([z.string(), z.number()]),
});

/** /roster (team and year): bio and class year. */
export const rosterPlayerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  firstName: str,
  lastName: str,
  team: str,
  weight: num,
  height: num,
  jersey: num,
  /** Class year 1-5 (freshman to fifth-year) */
  year: num,
  position: str,
  homeCity: str,
  homeState: str,
});

/** /player/search (by name): career team stints, colors, bio. */
export const playerSearchSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  team: str,
  name: z.string(),
  weight: num,
  height: num,
  jersey: num,
  position: str,
  hometown: str,
  activeStartYear: num,
  activeEndYear: num,
  teamStints: z
    .array(
      z.object({
        team: z.string(),
        startYear: z.number(),
        endYear: z.number(),
      }),
    )
    .nullish(),
});

const ppaSplits = z.object({
  all: num,
  pass: num,
  rush: num,
  firstDown: num,
  secondDown: num,
  thirdDown: num,
  standardDowns: num,
  passingDowns: num,
});

/** /ppa/players/season (accepts playerId alone). */
export const ppaPlayerSeasonSchema = z.object({
  season: num,
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  position: str,
  team: str,
  conference: str,
  averagePPA: ppaSplits,
});

/** Usage names its overall share `overall` (PPA calls the same slot `all`). */
const usageSplits = z.object({
  overall: num,
  pass: num,
  rush: num,
  firstDown: num,
  secondDown: num,
  thirdDown: num,
  standardDowns: num,
  passingDowns: num,
});

/** /player/usage (accepts playerId alone). Shares are 0-1 fractions of team plays. */
export const playerUsageSchema = z.object({
  season: num,
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  position: str,
  team: str,
  usage: usageSplits,
});

/** /ppa/players/games (needs team + playerId, or week). One row per game played. */
export const ppaPlayerGameSchema = z.object({
  season: num,
  week: z.number(),
  seasonType: str,
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  team: str,
  opponent: str,
  averagePPA: z.object({ all: num, pass: num, rush: num }),
});

/** /coaches (team + year): head coaches with the seasons they coached. */
export const coachSchema = z.object({
  id: num,
  firstName: str,
  lastName: str,
  seasons: z.array(
    z.object({
      school: z.string(),
      year: z.number(),
      games: num,
      wins: num,
      losses: num,
    }),
  ),
});

/** /ppa/games (team + year): team-level PPA per game. Offense and defense use the same splits. */
const teamPpaSide = z.object({ overall: num, passing: num, rushing: num });
export const ppaTeamGameSchema = z.object({
  gameId: num,
  season: num,
  week: z.number(),
  seasonType: str,
  team: z.string(),
  opponent: str,
  offense: teamPpaSide,
  defense: teamPpaSide,
});

/** /games/players (week + team): both teams' box score, category > type > athletes. All strings. */
export const gamePlayersSchema = z.object({
  id: z.number(),
  teams: z.array(
    z.object({
      team: z.string(),
      homeAway: str,
      categories: z.array(
        z.object({
          name: z.string(),
          types: z.array(
            z.object({
              name: z.string(),
              athletes: z.array(
                z.object({
                  id: z.union([z.string(), z.number()]).transform(String),
                  name: z.string(),
                  stat: z.union([z.string(), z.number()]).transform(String),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
});

const driveClock = z.object({ minutes: num, seconds: num }).nullish();

/** /drives (week + team): every drive of the team's game, both offenses. */
export const driveSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  gameId: z.number(),
  offense: z.string(),
  driveNumber: num,
  scoring: z.boolean().nullish(),
  endPeriod: num,
  endTime: driveClock,
  elapsed: driveClock,
  plays: num,
  yards: num,
  driveResult: str,
  isHomeOffense: z.boolean().nullish(),
  endOffenseScore: num,
  endDefenseScore: num,
});

export const teamsResponse = z.array(teamSchema);
export const calendarResponse = z.array(calendarWeekSchema);
export const scoreboardResponse = z.array(scoreboardGameSchema);
export const gamesResponse = z.array(gameSchema);
export const linesResponse = z.array(gameLinesSchema);
export const rankingsResponse = z.array(rankingWeekSchema);
export const gameTeamsResponse = z.array(gameTeamsSchema);
export const advancedResponse = z.array(advancedGameStatsSchema);
export const gamePlayersResponse = z.array(gamePlayersSchema);
export const drivesResponse = z.array(driveSchema);

export const spRatingsResponse = z.array(spRatingSchema);
export const seasonAdvancedResponse = z.array(seasonAdvancedSchema);
export const seasonStatsResponse = z.array(seasonStatSchema);
export const recordsResponse = z.array(recordSchema);

export type RawSpRating = z.infer<typeof spRatingSchema>;
export type RawSeasonAdvanced = z.infer<typeof seasonAdvancedSchema>;
export type RawSeasonStat = z.infer<typeof seasonStatSchema>;
export type RawRecord = z.infer<typeof recordSchema>;
export const playerStatsResponse = z.array(playerStatSchema);
export type RawPlayerStat = z.infer<typeof playerStatSchema>;
export const rosterResponse = z.array(rosterPlayerSchema);
export const playerSearchResponse = z.array(playerSearchSchema);
export const ppaPlayerSeasonResponse = z.array(ppaPlayerSeasonSchema);
export const playerUsageResponse = z.array(playerUsageSchema);
export const ppaPlayerGamesResponse = z.array(ppaPlayerGameSchema);
export type RawRosterPlayer = z.infer<typeof rosterPlayerSchema>;
export type RawPlayerSearch = z.infer<typeof playerSearchSchema>;
export type RawPpaPlayerSeason = z.infer<typeof ppaPlayerSeasonSchema>;
export type RawPlayerUsage = z.infer<typeof playerUsageSchema>;
export type RawPpaPlayerGame = z.infer<typeof ppaPlayerGameSchema>;
export const coachesResponse = z.array(coachSchema);
export const ppaTeamGamesResponse = z.array(ppaTeamGameSchema);
export type RawCoach = z.infer<typeof coachSchema>;
export type RawPpaTeamGame = z.infer<typeof ppaTeamGameSchema>;
export type RawTeam = z.infer<typeof teamSchema>;
export type RawCalendarWeek = z.infer<typeof calendarWeekSchema>;
export type RawScoreboardGame = z.infer<typeof scoreboardGameSchema>;
export type RawGame = z.infer<typeof gameSchema>;
export type RawGameLines = z.infer<typeof gameLinesSchema>;
export type RawRankingWeek = z.infer<typeof rankingWeekSchema>;
export type RawGameTeams = z.infer<typeof gameTeamsSchema>;
export type RawAdvancedGameStats = z.infer<typeof advancedGameStatsSchema>;
export type RawGamePlayers = z.infer<typeof gamePlayersSchema>;
export type RawDrive = z.infer<typeof driveSchema>;
