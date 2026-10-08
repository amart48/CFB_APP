export type PlayerCategoryId =
  | "passing"
  | "rushing"
  | "receiving"
  | "defensive"
  | "interceptions"
  | "kicking"
  | "punting"
  | "kickReturns"
  | "puntReturns";

/** How a stat renders: whole numbers, one decimal, a 0-1 fraction as a percent, or whole-unless-half. */
export type StatFormat = "int" | "dec1" | "pct" | "auto";

export type StatColumn = {
  /** CFBD statType, used as the sort key. */
  stat: string;
  label: string;
  format: StatFormat;
  /** Fewer is better (first click sorts ascending). */
  lowerBetter?: boolean;
};

export type PlayerCategory = {
  id: PlayerCategoryId;
  label: string;
  columns: StatColumn[];
  defaultSort: string;
  /** Minimum volume per team game to qualify (NCAA-style), or null for no minimum. */
  qualifier: { stat: string; perGame: number; noun: string } | null;
  /** Position filter options for this category (the API has no position list). */
  positions: string[];
};

const c = (
  stat: string,
  label: string,
  format: StatFormat,
  lowerBetter = false,
): StatColumn => ({
  stat,
  label,
  format,
  lowerBetter,
});

/** Tab order and column order match the Figma frames. */
export const CATEGORIES: PlayerCategory[] = [
  {
    id: "passing",
    label: "Passing",
    columns: [
      c("COMPLETIONS", "CMP", "int"),
      c("ATT", "ATT", "int"),
      c("PCT", "CMP %", "pct"),
      c("YDS", "YDS", "int"),
      c("YPA", "Y/A", "dec1"),
      c("TD", "TD", "int"),
      c("INT", "INT", "int", true),
    ],
    defaultSort: "YDS",
    qualifier: { stat: "ATT", perGame: 15, noun: "pass attempts" },
    positions: ["QB", "RB", "WR"],
  },
  {
    id: "rushing",
    label: "Rushing",
    columns: [
      c("CAR", "CAR", "int"),
      c("YDS", "YDS", "int"),
      c("YPC", "Y/C", "dec1"),
      c("TD", "TD", "int"),
      c("LONG", "LONG", "int"),
    ],
    defaultSort: "YDS",
    qualifier: { stat: "CAR", perGame: 10, noun: "carries" },
    positions: ["RB", "QB", "WR", "TE", "FB"],
  },
  {
    id: "receiving",
    label: "Receiving",
    columns: [
      c("REC", "REC", "int"),
      c("YDS", "YDS", "int"),
      c("YPR", "Y/R", "dec1"),
      c("TD", "TD", "int"),
      c("LONG", "LONG", "int"),
    ],
    defaultSort: "YDS",
    qualifier: { stat: "REC", perGame: 2.5, noun: "receptions" },
    positions: ["WR", "TE", "RB", "FB"],
  },
  {
    id: "defensive",
    label: "Defense",
    columns: [
      c("TOT", "TOT", "int"),
      c("SOLO", "SOLO", "int"),
      c("TFL", "TFL", "auto"),
      c("SACKS", "SACKS", "auto"),
      c("QB HUR", "HUR", "int"),
      c("PD", "PD", "int"),
      c("TD", "TD", "int"),
    ],
    defaultSort: "TOT",
    qualifier: null,
    positions: ["DL", "DE", "DT", "EDGE", "LB", "DB", "CB", "S"],
  },
  {
    id: "interceptions",
    label: "Interceptions",
    columns: [
      c("INT", "INT", "int"),
      c("YDS", "YDS", "int"),
      c("AVG", "AVG", "dec1"),
      c("TD", "TD", "int"),
    ],
    defaultSort: "INT",
    qualifier: null,
    positions: ["DB", "CB", "S", "LB"],
  },
  {
    id: "kicking",
    label: "Kicking",
    columns: [
      c("FGM", "FGM", "int"),
      c("FGA", "FGA", "int"),
      c("PCT", "FG %", "pct"),
      c("LONG", "LONG", "int"),
      c("XPM", "XPM", "int"),
      c("XPA", "XPA", "int"),
      c("PTS", "PTS", "int"),
    ],
    defaultSort: "PTS",
    qualifier: { stat: "FGA", perGame: 1, noun: "field goal attempts" },
    positions: ["PK"],
  },
  {
    id: "punting",
    label: "Punting",
    columns: [
      c("NO", "NO", "int"),
      c("YDS", "YDS", "int"),
      c("YPP", "AVG", "dec1"),
      c("LONG", "LONG", "int"),
      c("In 20", "IN 20", "int"),
      c("TB", "TB", "int", true),
    ],
    defaultSort: "YPP",
    qualifier: { stat: "NO", perGame: 3.6, noun: "punts" },
    positions: ["P"],
  },
  {
    id: "kickReturns",
    label: "Kick Returns",
    columns: [
      c("NO", "NO", "int"),
      c("YDS", "YDS", "int"),
      c("AVG", "AVG", "dec1"),
      c("LONG", "LONG", "int"),
      c("TD", "TD", "int"),
    ],
    defaultSort: "AVG",
    qualifier: { stat: "NO", perGame: 1.2, noun: "returns" },
    positions: ["WR", "RB", "DB", "CB"],
  },
  {
    id: "puntReturns",
    label: "Punt Returns",
    columns: [
      c("NO", "NO", "int"),
      c("YDS", "YDS", "int"),
      c("AVG", "AVG", "dec1"),
      c("LONG", "LONG", "int"),
      c("TD", "TD", "int"),
    ],
    defaultSort: "AVG",
    qualifier: { stat: "NO", perGame: 1.2, noun: "returns" },
    positions: ["WR", "RB", "DB", "CB"],
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((x) => [x.id, x]));
export const DEFAULT_CATEGORY = CATEGORIES[0];

export function formatStat(
  value: number | undefined,
  format: StatFormat,
): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  switch (format) {
    case "int":
      return Math.round(value).toLocaleString("en-US");
    case "dec1":
      return value.toFixed(1);
    case "pct":
      return `${(value * 100).toFixed(1)}%`;
    case "auto":
      return Number.isInteger(value)
        ? value.toLocaleString("en-US")
        : value.toFixed(1);
  }
}
