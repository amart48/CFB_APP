import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import type { PlayerStatRow, Team } from "../cfbd/models";
import { buildPlayerRows } from "../cfbd/normalize";
import type { RawPlayerStat } from "../cfbd/schemas";
import { CATEGORIES, CATEGORY_BY_ID, formatStat } from "./categories";
import {
  filterPlayers,
  parsePlayerFilters,
  playersHref,
  positionsOf,
} from "./params";
import {
  defaultPlayerSort,
  nextPlayerSort,
  parsePlayerSort,
  sortPlayers,
} from "./sort";

const team = (id: number, school: string, conference = "SEC"): Team => ({
  id,
  school,
  mascot: "",
  abbreviation: school.slice(0, 3).toUpperCase(),
  conference,
  color: "#000",
  altColor: "#fff",
  alternateNames: [],
});
const teams = [team(251, "Texas"), team(61, "Georgia")];
const raw = fixture<RawPlayerStat[]>("player-stats-season");
const games = new Map([
  [251, 5],
  [61, 5],
]);
const cat = (id: string) => CATEGORY_BY_ID.get(id as never)!;

describe("buildPlayerRows", () => {
  it("pivots one row per (player, stat) into one row per player for every category", () => {
    for (const category of CATEGORIES) {
      const { rows, droppedTeams } = buildPlayerRows(
        raw,
        teams,
        category,
        games,
      );
      expect(droppedTeams).toEqual([]);
      const ids = rows.map((r) => `${r.playerId}|${r.team.id}`);
      expect(new Set(ids).size).toBe(ids.length);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows)
        expect(Object.values(r.stats).every(Number.isFinite)).toBe(true);
    }
  });

  it("matches raw values for a passer, and parses percentages as 0-1 fractions", () => {
    const { rows } = buildPlayerRows(raw, teams, cat("passing"), games);
    const top = [...rows].sort((a, b) => b.stats.YDS - a.stats.YDS)[0];
    const src = raw.filter(
      (r) => r.playerId === top.playerId && r.category === "passing",
    );
    for (const s of src) expect(top.stats[s.statType]).toBe(Number(s.stat));
    expect(top.stats.PCT).toBeGreaterThan(0);
    expect(top.stats.PCT).toBeLessThanOrEqual(1);
  });

  it("applies the per-game qualifier", () => {
    const { rows } = buildPlayerRows(raw, teams, cat("passing"), games);
    for (const r of rows) expect(r.qualified).toBe(r.stats.ATT >= 15 * 5);
    expect(rows.some((r) => r.qualified)).toBe(true);
    expect(rows.some((r) => !r.qualified)).toBe(true);
  });

  it("qualifies nobody when the team's games are unknown, and everyone when there is no minimum", () => {
    expect(
      buildPlayerRows(raw, teams, cat("passing"), new Map()).rows.every(
        (r) => !r.qualified,
      ),
    ).toBe(true);
    expect(
      buildPlayerRows(raw, teams, cat("defensive"), new Map()).rows.every(
        (r) => r.qualified,
      ),
    ).toBe(true);
  });

  it("drops rows for unknown teams, reports them, and ignores other categories and bad values", () => {
    const extra: RawPlayerStat[] = [
      {
        season: 2026,
        playerId: "1",
        player: "X",
        position: "QB",
        team: "Nowhere State",
        conference: "?",
        category: "passing",
        statType: "YDS",
        stat: "10",
      },
      {
        season: 2026,
        playerId: "2",
        player: "Y",
        position: "QB",
        team: "Texas",
        conference: "SEC",
        category: "passing",
        statType: "YDS",
        stat: "abc",
      },
    ];
    const res = buildPlayerRows(extra, teams, cat("passing"), games);
    expect(res.rows).toEqual([]);
    expect(res.droppedTeams).toEqual(["Nowhere State"]);
    expect(
      buildPlayerRows(raw, teams, cat("kicking"), games).rows.every(
        (r) => r.stats.PTS !== undefined || r.stats.FGA !== undefined,
      ),
    ).toBe(true);
  });

  it("keeps a transferred player's two teams as two rows", () => {
    const two: RawPlayerStat[] = ["Texas", "Georgia"].map((t) => ({
      season: 2026,
      playerId: "9",
      player: "Transfer",
      position: "RB",
      team: t,
      conference: "SEC",
      category: "rushing",
      statType: "YDS",
      stat: "50",
    }));
    expect(
      buildPlayerRows(two, teams, cat("rushing"), games).rows,
    ).toHaveLength(2);
  });
});

const mk = (
  name: string,
  stats: Record<string, number>,
  o: Partial<PlayerStatRow> = {},
): PlayerStatRow => ({
  playerId: name,
  name,
  position: "QB",
  team: teams[0],
  stats,
  qualified: true,
  ...o,
});

describe("sortPlayers", () => {
  const passing = cat("passing");
  const a = mk("Ann", { YDS: 1000, INT: 3 });
  const b = mk("Bob", { YDS: 1200, INT: 1 });
  const c = mk("Cy", { YDS: 1000, INT: 0 });
  const d = mk("Di", {});
  const names = (r: PlayerStatRow[]) => r.map((x) => x.name);

  it("sorts high to low by default, ties by primary stat then name, missing last", () => {
    expect(
      names(sortPlayers([d, a, b, c], passing, defaultPlayerSort(passing))),
    ).toEqual(["Bob", "Ann", "Cy", "Di"]);
  });
  it("keeps missing values last when ascending", () => {
    expect(
      names(sortPlayers([d, a, b], passing, { stat: "YDS", dir: "asc" })),
    ).toEqual(["Ann", "Bob", "Di"]);
  });
  it("sorts interceptions thrown fewest first on the first click", () => {
    const next = nextPlayerSort(passing, defaultPlayerSort(passing), "INT");
    expect(next).toEqual({ stat: "INT", dir: "asc" });
    expect(names(sortPlayers([a, b, c], passing, next))).toEqual([
      "Cy",
      "Bob",
      "Ann",
    ]);
  });
  it("flips the sorted column and ignores unknown stats", () => {
    expect(
      nextPlayerSort(passing, { stat: "YDS", dir: "desc" }, "YDS").dir,
    ).toBe("asc");
    expect(parsePlayerSort(passing, "NOPE", "asc")).toEqual(
      defaultPlayerSort(passing),
    );
    expect(parsePlayerSort(passing, "INT", undefined)).toEqual({
      stat: "INT",
      dir: "asc",
    });
  });
});

describe("filterPlayers", () => {
  const rows = [
    mk("Arch Manning", { YDS: 1 }, { position: "QB" }),
    mk("José Ruiz", { YDS: 1 }, { position: "WR", team: team(61, "Georgia") }),
    mk("Bench Guy", { YDS: 1 }, { position: "QB", qualified: false }),
  ];
  const f = (o = {}) => ({
    conf: null,
    pos: null,
    q: "",
    qualified: false,
    ...o,
  });
  it("filters by qualification, position, conference", () => {
    expect(filterPlayers(rows, f({ qualified: true }))).toHaveLength(2);
    expect(filterPlayers(rows, f({ pos: "WR" }))).toHaveLength(1);
    expect(filterPlayers(rows, f({ conf: "ACC" }))).toHaveLength(0);
  });
  it("searches player name (accent-insensitive) or team", () => {
    expect(filterPlayers(rows, f({ q: "jose" }))[0].name).toBe("José Ruiz");
    expect(filterPlayers(rows, f({ q: "georgia" }))).toHaveLength(1);
    expect(filterPlayers(rows, f({ q: "zzz" }))).toHaveLength(0);
  });
  it("lists positions", () => {
    expect(positionsOf(rows)).toEqual(["QB", "WR"]);
  });
});

describe("player params", () => {
  it("parses with defaults, clamps limit, ignores junk", () => {
    const f = parsePlayerFilters({});
    expect(f.category.id).toBe("passing");
    expect(f.qualified).toBe(true);
    expect(f.limit).toBe(100);
    expect(parsePlayerFilters({ cat: "nope" }).category.id).toBe("passing");
    expect(parsePlayerFilters({ limit: "9999" }).limit).toBe(500);
    expect(parsePlayerFilters({ limit: "5" }).limit).toBe(100);
    expect(parsePlayerFilters({ qualified: "0" }).qualified).toBe(false);
  });
  it("builds hrefs, omitting defaults", () => {
    expect(playersHref("", {})).toBe("/players");
    expect(playersHref("conf=SEC", { q: "arch" })).toBe(
      "/players?conf=SEC&q=arch",
    );
    expect(playersHref("q=a", { q: "" })).toBe("/players");
    expect(playersHref("", { qualified: false })).toBe("/players?qualified=0");
    expect(playersHref("", { sort: { stat: "INT", dir: "asc" } })).toBe(
      "/players?sort=INT&dir=asc",
    );
    expect(
      playersHref("sort=INT&dir=asc", { sort: { stat: "YDS", dir: "desc" } }),
    ).toBe("/players");
  });
  it("resets sort, position and limit when switching category but keeps other filters", () => {
    const href = playersHref(
      "conf=SEC&pos=QB&sort=INT&dir=asc&limit=200&qualified=0",
      { category: cat("rushing") },
    );
    expect(href).toBe("/players?cat=rushing&conf=SEC&qualified=0");
  });
  it("returns to page one when a filter or sort changes, and grows the limit on request", () => {
    expect(playersHref("limit=300", { pos: "QB" })).toBe("/players?pos=QB");
    expect(playersHref("", { limit: 200 })).toBe("/players?limit=200");
    expect(playersHref("limit=200&q=a", { qualified: false })).toBe(
      "/players?q=a&qualified=0&limit=200",
    );
  });
  it("round-trips special stat names", () => {
    const href = playersHref("cat=defensive", {
      sort: { stat: "QB HUR", dir: "desc" },
    });
    expect(
      parsePlayerFilters(
        Object.fromEntries(new URL(href, "http://x").searchParams),
      ).sort.stat,
    ).toBe("QB HUR");
  });
});

describe("formatStat", () => {
  it("formats each kind and guards missing values", () => {
    expect(formatStat(1049, "int")).toBe("1,049");
    expect(formatStat(12450, "int")).toBe("12,450");
    expect(formatStat(10.34, "dec1")).toBe("10.3");
    expect(formatStat(0.755, "pct")).toBe("75.5%");
    expect(formatStat(3, "auto")).toBe("3");
    expect(formatStat(1.5, "auto")).toBe("1.5");
    expect(formatStat(undefined, "int")).toBe("—");
    expect(formatStat(NaN, "pct")).toBe("—");
  });
});
