import type { SideStats, TeamSeasonRow } from "../cfbd/models";

export type SortKey =
  | "team"
  | "rec"
  | "spOverall"
  | "spOffense"
  | "spDefense"
  | "offPpa"
  | "offSuccess"
  | "offExplosive"
  | "offYpp"
  | "offPpg"
  | "defPpa"
  | "defSuccess"
  | "defExplosive"
  | "defYpp"
  | "defPpg";

export type Dir = "asc" | "desc";
export type ColumnGroup = "team" | "sp" | "off" | "def";

export type Column = {
  key: SortKey;
  /** Heading text in the table. */
  label: string;
  /** Used in the "Sorted by ..." caption. */
  fullLabel: string;
  group: ColumnGroup;
  width: number;
  /** Direction of the first click. Lower-is-better columns start ascending. */
  defaultDir: Dir;
  value: (r: TeamSeasonRow) => number | string | null;
  format: (r: TeamSeasonRow) => string;
};

const DASH = "—";
const num = (n: number | null, digits: number) =>
  n === null ? DASH : n.toFixed(digits);
const pct = (n: number | null) =>
  n === null ? DASH : `${(n * 100).toFixed(1)}%`;

export function formatRecord(r: TeamSeasonRow["record"]): string {
  if (!r) return DASH;
  return r.ties > 0
    ? `${r.wins}-${r.losses}-${r.ties}`
    : `${r.wins}-${r.losses}`;
}

function winPct(r: TeamSeasonRow["record"]): number | null {
  if (!r) return null;
  const games = r.wins + r.losses + r.ties;
  return games === 0 ? null : (r.wins + r.ties / 2) / games;
}

type Side = "off" | "def";
function sideColumns(
  side: Side,
  group: ColumnGroup,
  name: string,
  lowerBetter: boolean,
): Column[] {
  const k = (s: string) => `${side}${s}` as SortKey;
  const get = (r: TeamSeasonRow): SideStats => r[side];
  const better: Dir = lowerBetter ? "asc" : "desc";
  const base = { group, width: 75, defaultDir: better };
  return [
    {
      ...base,
      key: k("Ppa"),
      label: "PPA/PLAY",
      fullLabel: `${name} PPA/Play`,
      value: (r) => get(r).ppa,
      format: (r) => num(get(r).ppa, 2),
    },
    {
      ...base,
      key: k("Success"),
      label: "SUCCESS %",
      fullLabel: `${name} Success Rate`,
      value: (r) => get(r).successRate,
      format: (r) => pct(get(r).successRate),
    },
    {
      ...base,
      key: k("Explosive"),
      label: "EXPLOSIVE",
      fullLabel: `${name} Explosiveness`,
      value: (r) => get(r).explosiveness,
      format: (r) => num(get(r).explosiveness, 2),
    },
    {
      ...base,
      key: k("Ypp"),
      label: "YDS/PLAY",
      fullLabel: `${name} Yards/Play`,
      value: (r) => get(r).yardsPerPlay,
      format: (r) => num(get(r).yardsPerPlay, 1),
    },
    {
      ...base,
      key: k("Ppg"),
      label: "PTS/G",
      fullLabel: `${name} Points/Game`,
      value: (r) => get(r).pointsPerGame,
      format: (r) => num(get(r).pointsPerGame, 1),
    },
  ];
}

/** Column order and widths match the Figma frames (RK is handled separately). */
export const COLUMNS: Column[] = [
  {
    key: "team",
    label: "TEAM",
    fullLabel: "Team",
    group: "team",
    width: 214,
    defaultDir: "asc",
    value: (r) => r.team.school,
    format: (r) => r.team.school,
  },
  {
    key: "rec",
    label: "REC",
    fullLabel: "Record",
    group: "team",
    width: 68,
    defaultDir: "desc",
    value: (r) => winPct(r.record),
    format: (r) => formatRecord(r.record),
  },
  {
    key: "spOverall",
    label: "OVR",
    fullLabel: "SP+ Overall",
    group: "sp",
    width: 80,
    defaultDir: "desc",
    value: (r) => r.spOverall,
    format: (r) => num(r.spOverall, 1),
  },
  {
    key: "spOffense",
    label: "OFF",
    fullLabel: "Off SP+",
    group: "sp",
    width: 80,
    defaultDir: "desc",
    value: (r) => r.spOffense,
    format: (r) => num(r.spOffense, 1),
  },
  {
    key: "spDefense",
    label: "DEF",
    fullLabel: "Def SP+",
    group: "sp",
    width: 80,
    defaultDir: "asc",
    value: (r) => r.spDefense,
    format: (r) => num(r.spDefense, 1),
  },
  ...sideColumns("off", "off", "Off", false),
  ...sideColumns("def", "def", "Def", true),
];

export const COLUMN_BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]));

/** First column of each group gets a left divider. */
export const GROUP_STARTS = new Set<SortKey>(["spOverall", "offPpa", "defPpa"]);

export const GROUPS: { label: string; span: number }[] = [
  { label: "SP+ RATINGS", span: 3 },
  { label: "OFFENSE", span: 5 },
  { label: "DEFENSE", span: 5 },
];
