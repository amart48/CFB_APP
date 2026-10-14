import { describe, expect, it } from "vitest";
import type { GameRow, Team, TeamGameStats } from "../cfbd/models";
import { contrastRatio, readableOnDark } from "../utils/color";
import { filterGames, groupByDay } from "./games";
import {
  buildHref,
  clearFiltersHref,
  hasActiveFilters,
  parseFilters,
} from "./params";
import { buildStatRows } from "./stat-rows";
import { liveClockLabel, periodLabel, statusLabel, winnerSide } from "./status";

const team = (id: number, school: string, conference: string): Team => ({
  id,
  school,
  mascot: "",
  abbreviation: school.slice(0, 3).toUpperCase(),
  conference,
  color: "#000000",
  altColor: "#ffffff",
  alternateNames: [],
});
const teams: Record<number, Team> = {
  1: team(1, "Texas", "SEC"),
  2: team(2, "Oklahoma", "SEC"),
  3: team(3, "San José State", "Mountain West"),
  4: team(4, "Wyoming", "Mountain West"),
};
const game = (
  id: number,
  away: number,
  home: number,
  startUtc: string,
  extra: Partial<GameRow> = {},
): GameRow => ({
  id,
  startUtc,
  startTbd: false,
  status: "scheduled",
  period: null,
  clock: null,
  home: { teamId: home, points: null, apRank: null, lineScores: null },
  away: { teamId: away, points: null, apRank: null, lineScores: null },
  tv: null,
  spreadHome: null,
  overUnder: null,
  neutralSite: false,
  venue: "",
  conferenceGame: false,
  ...extra,
});

describe("filter params", () => {
  it("parses and sanitizes", () => {
    expect(
      parseFilters({
        season: "2025",
        week: "p1",
        conf: "SEC",
        top25: "1",
        q: "tex",
      }),
    ).toEqual({
      season: 2025,
      week: "p1",
      conf: "SEC",
      top25: true,
      q: "tex",
    });
    expect(parseFilters({ season: "abc", week: "../x", conf: "All" })).toEqual({
      season: null,
      week: null,
      conf: null,
      top25: false,
      q: "",
    });
  });
  it("takes the first of repeated params", () => {
    expect(parseFilters({ conf: ["SEC", "ACC"] }).conf).toBe("SEC");
  });
  it("round-trips through buildHref and omits defaults", () => {
    const f = parseFilters({
      season: "2025",
      week: "6",
      conf: "SEC",
      top25: "1",
      q: "tex",
    });
    expect(
      parseFilters(
        Object.fromEntries(new URL(buildHref(f), "http://x").searchParams),
      ),
    ).toEqual(f);
    expect(buildHref(parseFilters({}))).toBe("/");
  });
  it("clears only the filters, not season or week", () => {
    const f = parseFilters({
      season: "2025",
      week: "6",
      conf: "SEC",
      top25: "1",
      q: "tex",
    });
    expect(clearFiltersHref(f)).toBe("/?season=2025&week=6");
    expect(hasActiveFilters(f)).toBe(true);
    expect(hasActiveFilters(parseFilters({ season: "2025" }))).toBe(false);
  });
});

describe("filterGames and groupByDay", () => {
  const games = [
    game(1, 1, 2, "2026-10-11T02:30:00Z"), // Texas @ Oklahoma, Sat 10:30 PM ET
    game(2, 3, 4, "2026-10-09T23:00:00Z"),
    game(3, 4, 1, "2026-10-10T16:00:00Z", {
      home: { teamId: 1, points: null, apRank: 3, lineScores: null },
    }),
  ];
  it("filters by conference, either team", () => {
    expect(
      filterGames(games, teams, { conf: "SEC", top25: false, q: "" }).map(
        (g) => g.id,
      ),
    ).toEqual([1, 3]);
  });
  it("filters Top 25 and search (accent-insensitive)", () => {
    expect(
      filterGames(games, teams, { conf: null, top25: true, q: "" }).map(
        (g) => g.id,
      ),
    ).toEqual([3]);
    expect(
      filterGames(games, teams, { conf: null, top25: false, q: "jose" }).map(
        (g) => g.id,
      ),
    ).toEqual([2]);
  });
  it("combines filters", () => {
    expect(
      filterGames(games, teams, { conf: "SEC", top25: true, q: "wyo" }).map(
        (g) => g.id,
      ),
    ).toEqual([3]);
  });
  it("groups by Eastern day and orders by kickoff", () => {
    const groups = groupByDay(games);
    expect(groups.map((g) => g.key)).toEqual(["2026-10-09", "2026-10-10"]);
    // the 02:30Z game belongs to Saturday in ET
    expect(groups[1].games.map((g) => g.id)).toEqual([3, 1]);
    expect(groups[1].heading).toBe("Saturday, Oct 10");
  });
});

describe("status", () => {
  const base = game(1, 1, 2, "2026-10-07T23:30:00Z");
  it("labels each state", () => {
    expect(statusLabel({ ...base, status: "final" })).toBe("Final");
    expect(
      statusLabel({ ...base, status: "live", period: 3, clock: "4:12" }),
    ).toBe("Q3 4:12");
    expect(statusLabel({ ...base, status: "live" })).toBe("Live");
    expect(statusLabel(base)).toBe("7:30 PM ET");
    expect(statusLabel({ ...base, startTbd: true })).toBe("TBD");
  });
  it("finds winners", () => {
    const fin = (a: number, h: number): GameRow => ({
      ...base,
      status: "final",
      away: { ...base.away, points: a },
      home: { ...base.home, points: h },
    });
    expect(winnerSide(fin(31, 24))).toBe("away");
    expect(winnerSide(fin(24, 31))).toBe("home");
    expect(winnerSide(fin(24, 24))).toBeNull();
    expect(winnerSide(base)).toBeNull();
  });
});

describe("buildStatRows", () => {
  const stats = (o: Partial<TeamGameStats>): TeamGameStats => ({
    gameId: 1,
    teamId: 1,
    totalYards: 458,
    rushYards: 172,
    passYards: 286,
    turnovers: 1,
    thirdDown: { made: 6, att: 13 },
    possessionSeconds: 32 * 60 + 18,
    plays: 68,
    yardsPerPlay: 6.7,
    successRate: 0.5,
    ppa: null,
    explosiveness: null,
    ...o,
  });
  const rows = buildStatRows(
    stats({}),
    stats({
      totalYards: 373,
      turnovers: 2,
      thirdDown: { made: 5, att: 14 },
      successRate: 0.415,
    }),
  );
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));

  it("matches the Figma values", () => {
    expect(rows).toHaveLength(8);
    expect(byLabel["Third Down %"].awayText).toBe("46.2% (6/13)");
    expect(byLabel["Third Down %"].homeText).toBe("35.7% (5/14)");
    expect(byLabel["Time of Possession"].awayText).toBe("32:18");
    expect(byLabel["Success Rate"].homeText).toBe("41.5%");
    expect(byLabel["Yards/Play"].awayText).toBe("6.7");
  });
  it("sizes bars against the larger value", () => {
    expect(byLabel["Total Yards"].awayFill).toBe(1);
    expect(byLabel["Total Yards"].homeFill).toBeCloseTo(373 / 458, 6); // 260.6px of 320 in Figma
  });
  it("inverts the winner for turnovers", () => {
    expect(byLabel["Turnovers"].winner).toBe("away");
    expect(byLabel["Turnovers"].awayFill).toBe(0.5);
    expect(byLabel["Total Yards"].winner).toBe("away");
  });
  it("handles missing advanced stats and zero attempts", () => {
    const r = buildStatRows(
      stats({
        plays: null,
        yardsPerPlay: null,
        successRate: null,
        thirdDown: { made: 0, att: 0 },
      }),
      stats({}),
    );
    const m = Object.fromEntries(r.map((x) => [x.label, x]));
    expect(m["Yards/Play"].awayText).toBe("—");
    expect(m["Yards/Play"].winner).toBe("home");
    expect(m["Third Down %"].awayText).toBe("—");
    expect(m["Success Rate"].awayFill).toBe(0);
  });
  it("reports ties", () => {
    const r = buildStatRows(stats({}), stats({}));
    expect(r.every((x) => x.winner === "tie")).toBe(true);
  });
});

describe("readableOnDark", () => {
  it("keeps colors that already pass", () => {
    expect(readableOnDark("#ff0000")).toBe("#ff0000");
  });
  it("lightens dark brand colors until contrast >= 3", () => {
    const out = readableOnDark("#0055a2", "#ffffff");
    expect(out).not.toBe("#0055a2");
    expect(contrastRatio(out, "#0b0d10")).toBeGreaterThanOrEqual(3);
  });
  it("prefers a passing alternate color", () => {
    expect(readableOnDark("#0b0d10", "#f0b323")).toBe("#f0b323");
  });
  it("survives bad input", () => {
    expect(readableOnDark("not-a-color")).toBe("not-a-color");
  });
});

describe("periodLabel", () => {
  it("names quarters then overtimes", () => {
    expect([1, 4, 5, 6, 7].map(periodLabel)).toEqual([
      "Q1",
      "Q4",
      "OT",
      "2OT",
      "3OT",
    ]);
  });
});

describe("liveClockLabel", () => {
  it("shows the running clock", () => {
    expect(liveClockLabel(3, "4:12")).toBe("Q3 4:12");
    expect(liveClockLabel(5, "7:00")).toBe("OT 7:00");
  });
  it("calls a stopped 0:00 clock halftime after Q2, end of period otherwise", () => {
    expect(liveClockLabel(2, "0:00")).toBe("Halftime");
    expect(liveClockLabel(1, "0:00")).toBe("End Q1");
    expect(liveClockLabel(3, "0:00")).toBe("End Q3");
    expect(liveClockLabel(5, "0:00")).toBe("End OT");
  });
  it("feeds the scoreboard row label", () => {
    const row = { period: 2, clock: "0:00" } as GameRow;
    expect(statusLabel({ ...row, status: "live" } as GameRow)).toBe("Halftime");
  });
});
