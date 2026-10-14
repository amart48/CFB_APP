import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import { buildTeamSeasonRows, normalizeTeams } from "../cfbd/normalize";
import type {
  RawGame,
  RawRecord,
  RawSeasonAdvanced,
  RawSeasonStat,
  RawSpRating,
  RawTeam,
} from "../cfbd/schemas";
import {
  buildComparison,
  compareHref,
  COMPARE_KEYS,
  parseCompareParams,
  percentile,
  tallyEdge,
} from "./compare";

const { rows } = buildTeamSeasonRows({
  teams: normalizeTeams(fixture<RawTeam[]>("teams-fbs")),
  sp: fixture<RawSpRating[]>("ratings-sp"),
  advanced: fixture<RawSeasonAdvanced[]>("stats-season-advanced"),
  seasonStats: fixture<RawSeasonStat[]>("stats-season"),
  records: fixture<RawRecord[]>("records"),
  games: fixture<RawGame[]>("games-season"),
});

describe("percentile", () => {
  const all = [1, 2, 3, 4, 5];
  it("puts the best value at 100 and the worst at 0", () => {
    expect(percentile(5, all, false)).toBe(100);
    expect(percentile(1, all, false)).toBe(0);
  });
  it("flips lower-is-better metrics", () => {
    expect(percentile(1, all, true)).toBe(100);
    expect(percentile(5, all, true)).toBe(0);
  });
  it("gives tied values the better percentile", () => {
    expect(percentile(3, [3, 3, 1], false)).toBe(100);
  });
  it("handles a single team", () => {
    expect(percentile(3, [3], false)).toBe(100);
  });
});

describe("buildComparison", () => {
  const [a, b] = rows;
  const metrics = buildComparison(rows, a.team.id, b.team.id)!;

  it("returns null when a team is missing", () => {
    expect(buildComparison(rows, a.team.id, -1)).toBeNull();
  });

  it("returns every compare metric in order", () => {
    expect(metrics.map((m) => m.key)).toEqual(COMPARE_KEYS);
  });

  it("names a winner consistent with the metric direction", () => {
    for (const m of metrics) {
      if (m.a.value === null || m.b.value === null) {
        expect(m.winner).toBeNull();
      } else if (m.a.value === m.b.value) {
        expect(m.winner).toBeNull();
      } else {
        const aHigher = m.a.value > m.b.value;
        expect(m.winner).toBe(aHigher !== m.lowerBetter ? "a" : "b");
      }
    }
  });

  it("gives the winner the higher percentile", () => {
    for (const m of metrics) {
      if (m.winner === null || m.a.percentile === null) continue;
      if (m.b.percentile === null) continue;
      const w = m.winner === "a" ? m.a : m.b;
      const l = m.winner === "a" ? m.b : m.a;
      expect(w.percentile!).toBeGreaterThanOrEqual(l.percentile!);
    }
  });

  it("compares a team with itself as all ties", () => {
    const same = buildComparison(rows, a.team.id, a.team.id)!;
    expect(same.every((m) => m.winner === null)).toBe(true);
  });
});

describe("compare params", () => {
  it("parses ids and season, ignoring junk", () => {
    expect(parseCompareParams({ season: "2024", a: "251", b: "x" })).toEqual({
      season: 2024,
      a: 251,
      b: null,
    });
    expect(parseCompareParams({ season: "1800", a: "-3" })).toEqual({
      season: null,
      a: null,
      b: null,
    });
  });

  it("builds hrefs, omitting empty values", () => {
    expect(compareHref("", {})).toBe("/compare");
    expect(compareHref("a=251&b=61", { season: 2023 })).toBe(
      "/compare?season=2023&a=251&b=61",
    );
    expect(compareHref("a=251&b=61", { b: null })).toBe("/compare?a=251");
  });
});

describe("tallyEdge", () => {
  it("counts wins per side and decided stats", () => {
    const [a, b] = rows;
    const metrics = buildComparison(rows, a.team.id, b.team.id)!;
    const edge = tallyEdge(metrics);
    expect(edge.decided).toBe(edge.a + edge.b);
    expect(edge.decided).toBeLessThanOrEqual(metrics.length);
  });

  it("is empty for a team against itself", () => {
    const metrics = buildComparison(rows, rows[0].team.id, rows[0].team.id)!;
    expect(tallyEdge(metrics)).toEqual({ a: 0, b: 0, decided: 0 });
  });
});
