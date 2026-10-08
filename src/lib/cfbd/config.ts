export const CFBD_BASE_URL = "https://api.collegefootballdata.com";

/** Next.js `revalidate` windows, in seconds. */
export const REVALIDATE = {
  /** Past seasons and completed weeks: effectively permanent. */
  permanent: 60 * 60 * 24 * 365,
  /** Current-season stats, standings, rankings, teams. */
  daily: 60 * 60 * 24,
  /** Current-week scoreboard and game data. Tuned against the 30,000/month call cap. */
  liveWeek: 60 * 10,
} as const;

/** Warn when the monthly call allowance gets low. */
export const LOW_CALLS_WARNING = 2000;

export type SeasonType = "regular" | "postseason";

export type WeekQuery = {
  year: number;
  week: number;
  seasonType: SeasonType;
};
