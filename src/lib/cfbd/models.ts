/** Our own typed models. UI code consumes these, never raw CFBD shapes. All serializable. */

export type Team = {
  id: number;
  school: string;
  mascot: string;
  abbreviation: string;
  conference: string;
  color: string;
  altColor: string;
  alternateNames: string[];
  /** Home stadium, when CFBD has one. */
  venue?: {
    name: string;
    city: string;
    state: string;
    capacity: number | null;
  };
};

export type GameStatus = "scheduled" | "live" | "final";

export type GameSide = {
  teamId: number;
  points: number | null;
  apRank: number | null;
  lineScores: number[] | null;
};

export type GameRow = {
  id: number;
  startUtc: string;
  startTbd: boolean;
  status: GameStatus;
  period: number | null;
  clock: string | null;
  home: GameSide;
  away: GameSide;
  tv: string | null;
  /** Home team's perspective: negative means home favored. */
  spreadHome: number | null;
  /** Total points line (over/under), or null when no provider has one. */
  overUnder: number | null;
  neutralSite: boolean;
  venue: string;
  conferenceGame: boolean;
};

export type TeamGameStats = {
  gameId: number;
  teamId: number;
  totalYards: number;
  rushYards: number;
  passYards: number;
  turnovers: number;
  thirdDown: { made: number; att: number };
  possessionSeconds: number;
  /** The fields below come from /stats/game/advanced and are null if it did not match. */
  plays: number | null;
  yardsPerPlay: number | null;
  successRate: number | null;
  ppa: number | null;
  explosiveness: number | null;
};

export type SideStats = {
  ppa: number | null;
  /** 0-1 */
  successRate: number | null;
  explosiveness: number | null;
  yardsPerPlay: number | null;
  pointsPerGame: number | null;
};

/** One row of the Team Season Stats table. Any source can be missing for a team (null). */
export type TeamSeasonRow = {
  team: Team;
  record: { wins: number; losses: number; ties: number } | null;
  spOverall: number | null;
  spOffense: number | null;
  spDefense: number | null;
  off: SideStats;
  def: SideStats;
};

/** One player in a category leaderboard. `stats` is keyed by CFBD statType ("YDS", "QB HUR"). */
export type PlayerStatRow = {
  playerId: string;
  name: string;
  position: string;
  team: Team;
  stats: Record<string, number>;
  /** Meets the NCAA-style per-team-game minimum for the category (always true if it has none). */
  qualified: boolean;
};

/** Average PPA or usage share by situation. Usage values are 0-1 fractions of team plays. */
export type SituationSplits = {
  all: number | null;
  pass: number | null;
  rush: number | null;
  firstDown: number | null;
  secondDown: number | null;
  thirdDown: number | null;
  standardDowns: number | null;
  passingDowns: number | null;
};

export type PlayerBio = {
  id: string;
  name: string;
  position: string;
  jersey: number | null;
  /** "Junior" etc., from the roster */
  classYear: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  hometown: string | null;
};

export type PlayerStint = { team: string; startYear: number; endYear: number };

export type PlayerGameLog = {
  week: number;
  opponent: string;
  ppaAll: number | null;
  ppaPass: number | null;
  ppaRush: number | null;
};

export type RecordSplit = { wins: number; losses: number; ties: number };

export type TeamRecord = {
  overall: RecordSplit | null;
  conference: RecordSplit | null;
  home: RecordSplit | null;
  away: RecordSplit | null;
  expectedWins: number | null;
};

export type ScheduleRow = {
  gameId: number;
  week: number;
  seasonType: string;
  startUtc: string;
  startTbd: boolean;
  opponent: { id: number; name: string };
  site: "home" | "away" | "neutral";
  venue: string;
  conferenceGame: boolean;
  completed: boolean;
  pointsFor: number | null;
  pointsAgainst: number | null;
  /** Null until the game is played. */
  result: "W" | "L" | "T" | null;
};

export type TeamGamePpa = {
  week: number;
  opponent: string;
  offense: number | null;
  defense: number | null;
};

export type PositionGroup =
  "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "ST" | "OTHER";

export type RosterPlayer = {
  id: string;
  name: string;
  jersey: number | null;
  position: string;
  group: PositionGroup;
  classYear: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  hometown: string | null;
};

export type TeamLeader = {
  key: string;
  label: string;
  playerId: string;
  name: string;
  position: string;
  value: number;
  unit: string;
  detail: string;
};

export type BoxCategoryId = "passing" | "rushing" | "receiving" | "defense";

/** One player table for one team. `values` line up with `columns`, as the strings CFBD sent. */
export type BoxPlayerTable = {
  category: BoxCategoryId;
  label: string;
  columns: { stat: string; label: string }[];
  rows: { playerId: string; name: string; values: string[] }[];
};

export type ScoringPlay = {
  driveId: string;
  side: "home" | "away";
  period: number;
  /** Clock when the drive ended; null in overtime (the clock is meaningless there). */
  clock: string | null;
  /** "Touchdown", "Field goal", ... */
  result: string;
  plays: number;
  yards: number;
  /** "7:04", or null when unknown or zero (overtime). */
  elapsed: string | null;
  /** Running score after the drive; null when the drive scores do not reconcile. */
  homeScore: number | null;
  awayScore: number | null;
};

export type BoxLine = {
  provider: string;
  /** Home team's perspective, like the scoreboard. */
  spreadHome: number | null;
  spreadOpenHome: number | null;
  overUnder: number | null;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
};

/** Everything the game page shows. Any panel can be empty (upcoming and live games). */
export type BoxScore = {
  game: GameRow & {
    season: number;
    week: number;
    seasonType: string;
    /** Live only, from /scoreboard: "1st & Goal at JXST 5". */
    situation?: string | null;
  };
  attendance: number | null;
  away: Team;
  home: Team;
  /** False for an opponent outside /teams/fbs: it has no team page to link to. */
  fbs: { away: boolean; home: boolean };
  awayStats: TeamGameStats | null;
  homeStats: TeamGameStats | null;
  awayPlayers: BoxPlayerTable[];
  homePlayers: BoxPlayerTable[];
  scoring: ScoringPlay[];
  line: BoxLine | null;
};
