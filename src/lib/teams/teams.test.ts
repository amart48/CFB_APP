import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import type { Team, TeamSeasonRow } from "../cfbd/models";
import { buildTeamSeasonRows, normalizeTeams } from "../cfbd/normalize";
import type {
  RawGame,
  RawRecord,
  RawSeasonAdvanced,
  RawSeasonStat,
  RawSpRating,
  RawTeam,
} from "../cfbd/schemas";
import { COLUMNS, formatRecord } from "./columns";
import { filterTeamRows, parseTeamFilters, teamsHref } from "./params";
import {
  DEFAULT_SORT,
  nextSort,
  parseSort,
  sortCaption,
  sortRows,
} from "./sort";

const teams = normalizeTeams(fixture<RawTeam[]>("teams-fbs"));
const sources = {
  teams,
  sp: fixture<RawSpRating[]>("ratings-sp"),
  advanced: fixture<RawSeasonAdvanced[]>("stats-season-advanced"),
  seasonStats: fixture<RawSeasonStat[]>("stats-season"),
  records: fixture<RawRecord[]>("records"),
  games: fixture<RawGame[]>("games-season"),
};

describe("buildTeamSeasonRows", () => {
  const { rows, unmatched } = buildTeamSeasonRows(sources);
  const row = (school: string) => rows.find((r) => r.team.school === school)!;

  it("builds one row per team and joins every source", () => {
    expect(rows).toHaveLength(teams.length);
    expect(unmatched).toEqual([]);
    for (const r of rows) {
      expect(r.spOverall).not.toBeNull();
      expect(r.record).not.toBeNull();
      expect(r.off.ppa).not.toBeNull();
      expect(r.off.yardsPerPlay).not.toBeNull();
      expect(r.def.pointsPerGame).not.toBeNull();
    }
  });

  it("drops the nationalAverages SP+ row", () => {
    expect(sources.sp.some((r) => r.team === "nationalAverages")).toBe(true);
    expect(rows.some((r) => r.team.school === "nationalAverages")).toBe(false);
  });

  it("matches SP+ values and records from the fixtures", () => {
    const lib = row("Liberty");
    const sp = sources.sp.find((r) => r.team === "Liberty")!;
    expect(lib.spOverall).toBe(sp.rating);
    expect(lib.spDefense).toBe(sp.defense.rating);
    expect(lib.record).toEqual({ wins: 4, losses: 1, ties: 0 });
  });

  it("derives yards per play from season yards and advanced plays", () => {
    const lib = row("Liberty");
    const yards = sources.seasonStats.find(
      (s) => s.team === "Liberty" && s.statName === "totalYards",
    )!;
    const oppYards = sources.seasonStats.find(
      (s) => s.team === "Liberty" && s.statName === "totalYardsOpponent",
    )!;
    const adv = sources.advanced.find((a) => a.team === "Liberty")!;
    expect(lib.off.yardsPerPlay).toBeCloseTo(
      yards.statValue / adv.offense.plays!,
      8,
    );
    expect(lib.def.yardsPerPlay).toBeCloseTo(
      oppYards.statValue / adv.defense.plays!,
      8,
    );
  });

  it("derives points per game from completed games only", () => {
    const id = row("Liberty").team.id;
    const done = sources.games.filter(
      (g) => g.completed && (g.homeId === id || g.awayId === id),
    );
    const pf = done.reduce(
      (n, g) => n + (g.homeId === id ? g.homePoints! : g.awayPoints!),
      0,
    );
    const pa = done.reduce(
      (n, g) => n + (g.homeId === id ? g.awayPoints! : g.homePoints!),
      0,
    );
    expect(row("Liberty").off.pointsPerGame).toBeCloseTo(pf / done.length, 8);
    expect(row("Liberty").def.pointsPerGame).toBeCloseTo(pa / done.length, 8);
  });

  it("reports unmatched names and leaves nulls instead of dropping the team", () => {
    const res = buildTeamSeasonRows({
      ...sources,
      sp: [],
      advanced: [],
      seasonStats: [],
      records: [],
      games: [],
    });
    expect(res.rows).toHaveLength(teams.length);
    expect(res.unmatched).toHaveLength(teams.length * 3);
    const r = res.rows[0];
    expect(r.spOverall).toBeNull();
    expect(r.record).toBeNull();
    expect(r.off.yardsPerPlay).toBeNull();
    expect(r.off.pointsPerGame).toBeNull();
  });

  it("guards zero plays and zero games", () => {
    const t = teams[0];
    const res = buildTeamSeasonRows({
      ...sources,
      sp: [],
      advanced: [
        {
          season: 2026,
          team: t.school,
          conference: "x",
          offense: { plays: 0 },
          defense: { plays: 0 },
        } as RawSeasonAdvanced,
      ],
      seasonStats: [{ team: t.school, statName: "totalYards", statValue: 100 }],
      games: [],
    });
    expect(res.rows[0].off.yardsPerPlay).toBeNull();
    expect(res.rows[0].off.pointsPerGame).toBeNull();
  });
});

describe("formatting", () => {
  const { rows } = buildTeamSeasonRows(sources);
  it("formats every column without throwing and uses an em dash for nulls", () => {
    for (const r of rows)
      for (const c of COLUMNS) expect(c.format(r)).not.toMatch(/NaN|undefined/);
    const empty = buildTeamSeasonRows({
      ...sources,
      sp: [],
      advanced: [],
      seasonStats: [],
      records: [],
      games: [],
    }).rows[0];
    expect(COLUMNS.find((c) => c.key === "spOverall")!.format(empty)).toBe("—");
    expect(COLUMNS.find((c) => c.key === "offSuccess")!.format(empty)).toBe(
      "—",
    );
  });
  it("formats records", () => {
    expect(formatRecord({ wins: 6, losses: 0, ties: 0 })).toBe("6-0");
    expect(formatRecord({ wins: 5, losses: 1, ties: 1 })).toBe("5-1-1");
    expect(formatRecord(null)).toBe("—");
  });
  it("formats percentages and decimals", () => {
    const r = {
      ...rows[0],
      off: {
        ...rows[0].off,
        successRate: 0.5234,
        ppa: 0.4,
        yardsPerPlay: 6.94,
        pointsPerGame: 38.44,
      },
    };
    const fmt = (k: string) => COLUMNS.find((c) => c.key === k)!.format(r);
    expect(fmt("offSuccess")).toBe("52.3%");
    expect(fmt("offPpa")).toBe("0.40");
    expect(fmt("offYpp")).toBe("6.9");
    expect(fmt("offPpg")).toBe("38.4");
  });
});

const mk = (school: string, o: Partial<TeamSeasonRow> = {}): TeamSeasonRow => ({
  team: {
    id: school.length,
    school,
    mascot: "",
    abbreviation: school.slice(0, 3).toUpperCase(),
    conference: "SEC",
    color: "#000",
    altColor: "#fff",
    alternateNames: [],
  } as Team,
  record: { wins: 1, losses: 1, ties: 0 },
  spOverall: 10,
  spOffense: 10,
  spDefense: 10,
  off: {
    ppa: 0,
    successRate: 0,
    explosiveness: 0,
    yardsPerPlay: 0,
    pointsPerGame: 0,
  },
  def: {
    ppa: 0,
    successRate: 0,
    explosiveness: 0,
    yardsPerPlay: 0,
    pointsPerGame: 0,
  },
  ...o,
});

describe("sortRows", () => {
  const a = mk("Alpha", { spOverall: 20, spDefense: 12 });
  const b = mk("Bravo", { spOverall: 30, spDefense: 5 });
  const c = mk("Charlie", { spOverall: null, spDefense: null });
  const d = mk("Delta", { spOverall: 10, spDefense: 5 });
  const names = (rows: TeamSeasonRow[]) => rows.map((r) => r.team.school);

  it("sorts SP+ overall high to low by default", () => {
    expect(names(sortRows([a, c, b, d], DEFAULT_SORT))).toEqual([
      "Bravo",
      "Alpha",
      "Delta",
      "Charlie",
    ]);
  });
  it("keeps nulls last in both directions", () => {
    expect(
      names(sortRows([c, a, b], { key: "spOverall", dir: "asc" })),
    ).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
  it("breaks ties by SP+ overall, then name", () => {
    // Bravo and Delta tie on defense 5; Bravo has higher SP+ overall
    expect(
      names(sortRows([a, b, d], { key: "spDefense", dir: "asc" })),
    ).toEqual(["Bravo", "Delta", "Alpha"]);
    const x = mk("Xray", { spOverall: 10 });
    const w = mk("Whiskey", { spOverall: 10 });
    expect(names(sortRows([x, w], { key: "offPpa", dir: "desc" }))).toEqual([
      "Whiskey",
      "Xray",
    ]);
  });
  it("sorts team names and record by win percentage", () => {
    expect(names(sortRows([b, a], { key: "team", dir: "asc" }))).toEqual([
      "Alpha",
      "Bravo",
    ]);
    const hi = mk("Hi", { record: { wins: 6, losses: 0, ties: 0 } });
    const lo = mk("Lo", { record: { wins: 1, losses: 4, ties: 0 } });
    expect(names(sortRows([lo, hi], { key: "rec", dir: "desc" }))).toEqual([
      "Hi",
      "Lo",
    ]);
  });
  it("does not mutate its input", () => {
    const input = [a, b];
    sortRows(input, DEFAULT_SORT);
    expect(names(input)).toEqual(["Alpha", "Bravo"]);
  });
});

describe("sort state", () => {
  it("first click on a lower-is-better column sorts ascending (best first)", () => {
    expect(nextSort(DEFAULT_SORT, "spDefense")).toEqual({
      key: "spDefense",
      dir: "asc",
    });
    expect(nextSort(DEFAULT_SORT, "defPpa")).toEqual({
      key: "defPpa",
      dir: "asc",
    });
    expect(nextSort(DEFAULT_SORT, "offPpg")).toEqual({
      key: "offPpg",
      dir: "desc",
    });
    expect(nextSort(DEFAULT_SORT, "team")).toEqual({ key: "team", dir: "asc" });
  });
  it("clicking the sorted column flips direction", () => {
    expect(nextSort({ key: "spDefense", dir: "asc" }, "spDefense").dir).toBe(
      "desc",
    );
    expect(nextSort(DEFAULT_SORT, "spOverall").dir).toBe("asc");
  });
  it("parses sort params and ignores junk", () => {
    expect(parseSort("spDefense", "desc")).toEqual({
      key: "spDefense",
      dir: "desc",
    });
    expect(parseSort("spDefense", undefined)).toEqual({
      key: "spDefense",
      dir: "asc",
    });
    expect(parseSort("nope", "asc")).toEqual(DEFAULT_SORT);
    expect(parseSort(undefined, undefined)).toEqual(DEFAULT_SORT);
  });
  it("describes the sort", () => {
    expect(sortCaption(DEFAULT_SORT)).toBe(
      "Sorted by SP+ Overall (best first)",
    );
    expect(sortCaption({ key: "spDefense", dir: "asc" })).toBe(
      "Sorted by Def SP+ (best first)",
    );
    expect(sortCaption({ key: "spDefense", dir: "desc" })).toBe(
      "Sorted by Def SP+ (worst first)",
    );
    expect(sortCaption({ key: "team", dir: "desc" })).toBe(
      "Sorted by Team (Z to A)",
    );
  });
});

describe("team filters and hrefs", () => {
  it("parses and sanitizes", () => {
    expect(
      parseTeamFilters({
        season: "2025",
        conf: "SEC",
        q: "tex",
        sort: "defPpa",
      }),
    ).toEqual({
      season: 2025,
      conf: "SEC",
      q: "tex",
      sort: { key: "defPpa", dir: "asc" },
    });
    expect(parseTeamFilters({ season: "x", conf: "All" })).toEqual({
      season: null,
      conf: null,
      q: "",
      sort: DEFAULT_SORT,
    });
  });
  it("builds hrefs, omitting defaults and keeping other params", () => {
    expect(teamsHref("", {})).toBe("/teams");
    expect(teamsHref("conf=SEC&sort=spDefense&dir=asc", { q: "tex" })).toBe(
      "/teams?conf=SEC&q=tex&sort=spDefense&dir=asc",
    );
    expect(teamsHref("conf=SEC&q=tex", { conf: null })).toBe("/teams?q=tex");
    expect(teamsHref("sort=team&dir=asc", { sort: DEFAULT_SORT })).toBe(
      "/teams",
    );
    expect(teamsHref("season=2025", { season: null })).toBe("/teams");
  });
  it("filters by conference and accent-insensitive search", () => {
    const rows = [
      mk("San José State", {
        team: {
          ...mk("x").team,
          school: "San José State",
          conference: "Mountain West",
        },
      }),
      mk("Texas"),
    ];
    expect(filterTeamRows(rows, { conf: "SEC", q: "" })).toHaveLength(1);
    expect(filterTeamRows(rows, { conf: null, q: "jose" })[0].team.school).toBe(
      "San José State",
    );
    expect(filterTeamRows(rows, { conf: "SEC", q: "jose" })).toHaveLength(0);
  });
});
