import type { PlayerStatRow } from "../cfbd/models";
import { normalizeText, teamMatches } from "../utils/search";
import {
  CATEGORY_BY_ID,
  DEFAULT_CATEGORY,
  type PlayerCategory,
} from "./categories";
import { isDefaultPlayerSort, parsePlayerSort, type PlayerSort } from "./sort";

export const PAGE_SIZE = 100;
export const MAX_LIMIT = 500;

/** Player leaderboard state lives in URL search params. */
export type PlayerFilters = {
  category: PlayerCategory;
  /** null = current season */
  season: number | null;
  conf: string | null;
  pos: string | null;
  q: string;
  /** true (default) applies the category's per-game minimum */
  qualified: boolean;
  sort: PlayerSort;
  limit: number;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parsePlayerFilters(sp: Raw): PlayerFilters {
  const category =
    CATEGORY_BY_ID.get(first(sp.cat) as never) ?? DEFAULT_CATEGORY;
  const season = Number.parseInt(first(sp.season) ?? "", 10);
  const conf = first(sp.conf);
  const pos = first(sp.pos);
  const limit = Number.parseInt(first(sp.limit) ?? "", 10);
  return {
    category,
    season:
      Number.isFinite(season) && season >= 2001 && season <= 2100
        ? season
        : null,
    conf: conf && conf !== "All" ? conf : null,
    pos: pos && pos !== "All" ? pos.slice(0, 10) : null,
    q: (first(sp.q) ?? "").slice(0, 60),
    qualified: first(sp.qualified) !== "0",
    sort: parsePlayerSort(category, first(sp.sort), first(sp.dir)),
    limit: Number.isFinite(limit)
      ? Math.min(Math.max(limit, PAGE_SIZE), MAX_LIMIT)
      : PAGE_SIZE,
  };
}

export const hasActivePlayerFilters = (
  f: Pick<PlayerFilters, "conf" | "pos" | "q">,
) => f.conf !== null || f.pos !== null || f.q.trim() !== "";

type Patch = Partial<Omit<PlayerFilters, "category" | "sort">> & {
  category?: PlayerCategory;
  sort?: PlayerSort;
};

/**
 * Builds "/players?..." from a query string and a patch, omitting defaults. Switching category
 * resets sort, position and limit, since those only make sense within a category.
 */
export function playersHref(query: string, patch: Patch): string {
  const f = parsePlayerFilters(Object.fromEntries(new URLSearchParams(query)));
  const switching =
    patch.category !== undefined && patch.category.id !== f.category.id;
  const category = patch.category ?? f.category;
  const n = {
    season: patch.season === undefined ? f.season : patch.season,
    conf: patch.conf === undefined ? f.conf : patch.conf,
    pos: switching ? null : patch.pos === undefined ? f.pos : patch.pos,
    q: patch.q === undefined ? f.q : patch.q,
    qualified: patch.qualified === undefined ? f.qualified : patch.qualified,
    sort: switching ? undefined : (patch.sort ?? f.sort),
    // a new filter or sort starts back at the first page
    limit:
      patch.limit ??
      (switching ||
      patch.sort ||
      patch.pos !== undefined ||
      patch.conf !== undefined ||
      patch.q !== undefined
        ? PAGE_SIZE
        : f.limit),
  };
  const sp = new URLSearchParams();
  if (category.id !== DEFAULT_CATEGORY.id) sp.set("cat", category.id);
  if (n.season !== null) sp.set("season", String(n.season));
  if (n.conf !== null) sp.set("conf", n.conf);
  if (n.pos !== null) sp.set("pos", n.pos);
  if (n.q.trim() !== "") sp.set("q", n.q.trim());
  if (!n.qualified) sp.set("qualified", "0");
  if (n.sort && !isDefaultPlayerSort(category, n.sort)) {
    sp.set("sort", n.sort.stat);
    sp.set("dir", n.sort.dir);
  }
  if (n.limit > PAGE_SIZE) sp.set("limit", String(n.limit));
  const qs = sp.toString();
  return qs ? `/players?${qs}` : "/players";
}

/** Conference, position, qualification and name/team search. */
export function filterPlayers(
  rows: PlayerStatRow[],
  f: Pick<PlayerFilters, "conf" | "pos" | "q" | "qualified">,
): PlayerStatRow[] {
  const q = normalizeText(f.q);
  return rows.filter(
    (r) =>
      (!f.conf || r.team.conference === f.conf) &&
      (!f.pos || r.position === f.pos) &&
      (!f.qualified || r.qualified) &&
      (!q || normalizeText(r.name).includes(q) || teamMatches(r.team, f.q)),
  );
}

export function positionsOf(rows: PlayerStatRow[]): string[] {
  return [...new Set(rows.map((r) => r.position).filter(Boolean))].sort();
}
