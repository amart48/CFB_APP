/** Scoreboard filter state lives in URL search params so views are shareable. */
export type Filters = {
  /** null = current season */
  season: number | null;
  /** "6" for regular-season week 6, "p1" for postseason; null = current week */
  week: string | null;
  /** null = all conferences */
  conf: string | null;
  top25: boolean;
  q: string;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parseFilters(sp: RawSearchParams): Filters {
  const season = Number.parseInt(first(sp.season) ?? "", 10);
  const week = first(sp.week);
  const conf = first(sp.conf);
  return {
    season:
      Number.isFinite(season) && season >= 2001 && season <= 2100
        ? season
        : null,
    week: week && /^(p?\d{1,2})$/.test(week) ? week : null,
    conf: conf && conf !== "All" ? conf : null,
    top25: first(sp.top25) === "1",
    q: (first(sp.q) ?? "").slice(0, 60),
  };
}

export function hasActiveFilters(f: Filters): boolean {
  return f.conf !== null || f.top25 || f.q.trim() !== "";
}

/** Builds "/?..." omitting defaults. `patch` overrides fields of `f`. */
export function buildHref(f: Filters, patch: Partial<Filters> = {}): string {
  const n = { ...f, ...patch };
  const sp = new URLSearchParams();
  if (n.season !== null) sp.set("season", String(n.season));
  if (n.week !== null) sp.set("week", n.week);
  if (n.conf !== null) sp.set("conf", n.conf);
  if (n.top25) sp.set("top25", "1");
  if (n.q.trim() !== "") sp.set("q", n.q.trim());
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

/** Same view with every filter cleared (season and week stay). */
export function clearFiltersHref(f: Filters): string {
  return buildHref(f, { conf: null, top25: false, q: "" });
}
