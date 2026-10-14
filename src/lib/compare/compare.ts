import type { TeamSeasonRow } from "../cfbd/models";
import { COLUMNS, type Column, type SortKey } from "../teams/columns";

/** The columns the comparison shows, in display order. Direction comes from `defaultDir`. */
export const COMPARE_KEYS: SortKey[] = [
  "spOverall",
  "spOffense",
  "spDefense",
  "offPpa",
  "offSuccess",
  "offExplosive",
  "offYpp",
  "offPpg",
  "defPpa",
  "defSuccess",
  "defExplosive",
  "defYpp",
  "defPpg",
];

/** The radar axes: one offense and one defense reading of each idea. */
export const RADAR_KEYS: SortKey[] = [
  "offPpa",
  "offSuccess",
  "offExplosive",
  "offPpg",
  "defPpa",
  "defSuccess",
  "defExplosive",
  "defPpg",
];

const COLUMN_BY_KEY = new Map<SortKey, Column>(COLUMNS.map((c) => [c.key, c]));

export type CompareMetric = {
  key: SortKey;
  label: string;
  group: Column["group"];
  lowerBetter: boolean;
  a: { text: string; value: number | null; percentile: number | null };
  b: { text: string; value: number | null; percentile: number | null };
  /** Which side is better on this metric, or null for a tie or a missing value. */
  winner: "a" | "b" | null;
};

/**
 * Where `value` sits among all teams, 0-100 with 100 best. Ties share the better percentile.
 * Lower-is-better metrics are flipped so a bigger number always means a better team.
 */
export function percentile(
  value: number,
  all: number[],
  lowerBetter: boolean,
): number {
  if (all.length <= 1) return 100;
  const better = all.filter((v) =>
    lowerBetter ? v < value : v > value,
  ).length;
  return Math.round((1 - better / (all.length - 1)) * 100);
}

const numeric = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Side-by-side metrics for two teams, each placed against every team in `rows`. */
export function buildComparison(
  rows: TeamSeasonRow[],
  aId: number,
  bId: number,
): CompareMetric[] | null {
  const a = rows.find((r) => r.team.id === aId);
  const b = rows.find((r) => r.team.id === bId);
  if (!a || !b) return null;

  const metrics: CompareMetric[] = [];
  for (const key of COMPARE_KEYS) {
    const col = COLUMN_BY_KEY.get(key);
    if (!col) continue;
    const lowerBetter = col.defaultDir === "asc";
    const all = rows
      .map((r) => numeric(col.value(r)))
      .filter((v): v is number => v !== null);
    const side = (r: TeamSeasonRow) => {
      const value = numeric(col.value(r));
      return {
        text: col.format(r),
        value,
        percentile: value === null ? null : percentile(value, all, lowerBetter),
      };
    };
    const sa = side(a);
    const sb = side(b);
    let winner: CompareMetric["winner"] = null;
    if (sa.value !== null && sb.value !== null && sa.value !== sb.value) {
      winner = sa.value > sb.value !== lowerBetter ? "a" : "b";
    }
    metrics.push({
      key,
      label: col.fullLabel,
      group: col.group,
      lowerBetter,
      a: sa,
      b: sb,
      winner,
    });
  }
  return metrics;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;
const id = (v: string | string[] | undefined): number | null => {
  const n = Number.parseInt(first(v) ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Compare state lives in URL search params: season (null = current), team ids a and b. */
export type CompareParams = {
  season: number | null;
  a: number | null;
  b: number | null;
};

export function parseCompareParams(sp: Raw): CompareParams {
  const season = Number.parseInt(first(sp.season) ?? "", 10);
  return {
    season:
      Number.isFinite(season) && season >= 2001 && season <= 2100
        ? season
        : null,
    a: id(sp.a),
    b: id(sp.b),
  };
}

/** Builds "/compare?..." from a query string and a patch, omitting empty values. */
export function compareHref(
  query: string,
  patch: Partial<CompareParams>,
): string {
  const cur = parseCompareParams(
    Object.fromEntries(new URLSearchParams(query)),
  );
  const n = { ...cur, ...patch };
  const sp = new URLSearchParams();
  if (n.season !== null) sp.set("season", String(n.season));
  if (n.a !== null) sp.set("a", String(n.a));
  if (n.b !== null) sp.set("b", String(n.b));
  const qs = sp.toString();
  return qs ? `/compare?${qs}` : "/compare";
}

/** How many metrics each side wins, and how many were decided (both values present, not tied). */
export function tallyEdge(metrics: CompareMetric[]): {
  a: number;
  b: number;
  decided: number;
} {
  const a = metrics.filter((m) => m.winner === "a").length;
  const b = metrics.filter((m) => m.winner === "b").length;
  return { a, b, decided: a + b };
}
