import type { TeamSeasonRow } from "../cfbd/models";
import { teamMatches } from "../utils/search";
import { DEFAULT_SORT, isDefaultSort, parseSort, type Sort } from "./sort";

/** Team table state lives in URL search params. */
export type TeamFilters = {
  /** null = current season */
  season: number | null;
  /** null = all conferences */
  conf: string | null;
  q: string;
  sort: Sort;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parseTeamFilters(sp: Raw): TeamFilters {
  const season = Number.parseInt(first(sp.season) ?? "", 10);
  const conf = first(sp.conf);
  return {
    season:
      Number.isFinite(season) && season >= 2001 && season <= 2100
        ? season
        : null,
    conf: conf && conf !== "All" ? conf : null,
    q: (first(sp.q) ?? "").slice(0, 60),
    sort: parseSort(first(sp.sort), first(sp.dir)),
  };
}

export const hasActiveTeamFilters = (f: Pick<TeamFilters, "conf" | "q">) =>
  f.conf !== null || f.q.trim() !== "";

/** Builds "/teams?..." from a query string and a patch, omitting defaults. `null` removes a key. */
export function teamsHref(
  query: string,
  patch: {
    season?: number | null;
    conf?: string | null;
    q?: string;
    sort?: Sort;
  },
): string {
  const f = parseTeamFilters(Object.fromEntries(new URLSearchParams(query)));
  const n = {
    season: patch.season === undefined ? f.season : patch.season,
    conf: patch.conf === undefined ? f.conf : patch.conf,
    q: patch.q === undefined ? f.q : patch.q,
    sort: patch.sort ?? f.sort,
  };
  const sp = new URLSearchParams();
  if (n.season !== null) sp.set("season", String(n.season));
  if (n.conf !== null) sp.set("conf", n.conf);
  if (n.q.trim() !== "") sp.set("q", n.q.trim());
  if (!isDefaultSort(n.sort)) {
    sp.set("sort", n.sort.key);
    sp.set("dir", n.sort.dir);
  }
  const qs = sp.toString();
  return qs ? `/teams?${qs}` : "/teams";
}

export function filterTeamRows(
  rows: TeamSeasonRow[],
  f: Pick<TeamFilters, "conf" | "q">,
): TeamSeasonRow[] {
  return rows.filter(
    (r) =>
      (!f.conf || r.team.conference === f.conf) &&
      (!f.q.trim() || teamMatches(r.team, f.q)),
  );
}

export { DEFAULT_SORT };
