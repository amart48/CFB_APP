import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import type {
  RawAdvancedGameStats,
  RawGame,
  RawGameLines,
  RawGameTeams,
  RawRankingWeek,
  RawScoreboardGame,
  RawTeam,
} from "../schemas";
import {
  apRankMap,
  conferencesOf,
  isTop25Game,
  normalizeGame,
  normalizeScoreboardGame,
  normalizeTeamGameStats,
  normalizeTeams,
  parseMadeAtt,
  spreadByGame,
  statMap,
  thirdDownPercent,
} from ".";

const games = fixture<RawGame[]>("games");
const lines = fixture<RawGameLines[]>("lines");
const rankings = fixture<RawRankingWeek[]>("rankings");
const scoreboard = fixture<RawScoreboardGame[]>("scoreboard");

describe("rankings", () => {
  const ap = apRankMap(rankings);
  it("builds the AP map from the 'AP Top 25' poll only", () => {
    expect(ap.size).toBe(25);
    expect(ap.get(251)).toBe(1); // Texas is #1 in the fixture
  });
  it("is empty when the poll is missing", () => {
    expect(apRankMap([{ ...rankings[0], polls: [] }]).size).toBe(0);
    expect(apRankMap([]).size).toBe(0);
  });
  it("supports shared ranks", () => {
    const tied: RawRankingWeek = {
      ...rankings[0],
      polls: [
        {
          poll: "AP Top 25",
          ranks: [
            { rank: 5, teamId: 1, school: "A" },
            { rank: 5, teamId: 2, school: "B" },
          ],
        },
      ],
    };
    const map = apRankMap([tied]);
    expect(map.get(1)).toBe(5);
    expect(map.get(2)).toBe(5);
  });
});

describe("lines", () => {
  it("prefers DraftKings over earlier providers", () => {
    const spreads = spreadByGame(lines);
    expect(spreads.get(401862786)).toBe(3); // Bovada says 1, DraftKings says 3
    expect(spreads.get(401871050)).toBe(7);
  });
  it("falls back to the first provider and handles no lines", () => {
    const other: RawGameLines = {
      id: 1,
      homeTeamId: 1,
      awayTeamId: 2,
      lines: [{ provider: "Bovada", spread: -2 }],
    } as RawGameLines;
    const none: RawGameLines = { ...other, id: 2, lines: [] };
    const map = spreadByGame([other, none]);
    expect(map.get(1)).toBe(-2);
    expect(map.has(2)).toBe(false);
  });
});

describe("normalizeGame (past weeks)", () => {
  const ranks = new Map([[251, 1]]);
  const spreads = spreadByGame(lines);
  const rows = games.map((g) => normalizeGame(g, ranks, spreads));
  it("maps scores, status and the joined spread", () => {
    const g = rows.find((r) => r.id === 401871050)!;
    expect(g.status).toBe("final");
    expect(g.home.points).toBe(14);
    expect(g.away.points).toBe(30);
    expect(g.spreadHome).toBe(7);
    expect(g.tv).toBeNull();
  });
  it("flags Top 25 games", () => {
    expect(rows.some(isTop25Game)).toBe(false);
    expect(
      isTop25Game({ ...rows[0], home: { ...rows[0].home, apRank: 3 } }),
    ).toBe(true);
  });
});

describe("normalizeScoreboardGame", () => {
  const rows = scoreboard.map((g) => normalizeScoreboardGame(g, new Map()));
  it("maps completed and scheduled statuses", () => {
    expect(rows[0].status).toBe("final");
    expect(rows[1].status).toBe("scheduled");
    expect(rows[1].home.points).toBeNull();
  });
  it("cleans TV and keeps the home-perspective spread", () => {
    expect(rows[0].tv).toBe("ESPN2");
    expect(rows[0].spreadHome).toBe(-9.5);
  });
  it("in_progress (verified live value) is live; the clock loses its zero padding and shows only then", () => {
    const live = normalizeScoreboardGame(
      { ...scoreboard[1], status: "in_progress", period: 2, clock: "07:12" },
      new Map(),
    );
    expect(live.status).toBe("live");
    expect(live.period).toBe(2);
    expect(live.clock).toBe("7:12");
    const sched = normalizeScoreboardGame(
      { ...scoreboard[1], period: 2, clock: "07:12" },
      new Map(),
    );
    expect(sched.clock).toBeNull();
    const other = normalizeScoreboardGame(
      { ...scoreboard[1], status: "halftime", period: 2, clock: "00:00" },
      new Map(),
    );
    expect(other.status).toBe("live"); // any non-scheduled/completed status counts as live
  });
  it("parses a real in-progress scoreboard capture", () => {
    const g = normalizeScoreboardGame(
      fixture<RawScoreboardGame[]>("live-scoreboard")[0],
      new Map(),
    );
    expect(g.status).toBe("live");
    expect(g.period).not.toBeNull();
    expect(g.clock).toMatch(/^\d{1,2}:\d{2}$/);
    expect(g.home.points).not.toBeNull();
  });
});

describe("teams", () => {
  const teams = normalizeTeams(fixture<RawTeam[]>("teams-fbs"));
  it("normalizes and lists conferences from data", () => {
    expect(teams.length).toBeGreaterThan(0);
    expect(teams[0]).toHaveProperty("altColor");
    expect(conferencesOf(teams)).toEqual(
      [...new Set(teams.map((t) => t.conference))].sort(),
    );
  });
  it("falls back when brand fields are missing", () => {
    const [t] = normalizeTeams([{ id: 9, school: "Nowhere State" }]);
    expect(t.abbreviation).toBe("NOWH");
    expect(t.conference).toBe("Independent");
    expect(t.color).toMatch(/^#/);
  });
});

describe("stats parsing", () => {
  it("reads stats by category, not position", () => {
    const m = statMap([
      { category: "b", stat: "2" },
      { category: "a", stat: "1" },
    ]);
    expect(m.get("a")).toBe("1");
  });
  it("parses made-attempts and guards zero attempts", () => {
    expect(parseMadeAtt("6-9")).toEqual({ made: 6, att: 9 });
    expect(parseMadeAtt(undefined)).toEqual({ made: 0, att: 0 });
    expect(thirdDownPercent({ made: 6, att: 9 })).toBeCloseTo(66.67, 1);
    expect(thirdDownPercent({ made: 0, att: 0 })).toBeNull();
  });
});

describe("normalizeTeamGameStats", () => {
  const gt = fixture<RawGameTeams[]>("games-teams");
  const adv = fixture<RawAdvancedGameStats[]>("stats-game-advanced");

  it("joins game-team stats with advanced stats by gameId and team name", () => {
    const { stats, unmatched } = normalizeTeamGameStats(gt, adv);
    expect(unmatched).toEqual([]);
    expect(stats).toHaveLength(6);
    const rawTeam = gt[0].teams[0];
    const s = stats.find(
      (x) => x.gameId === gt[0].id && x.teamId === rawTeam.teamId,
    )!;
    const m = statMap(rawTeam.stats);
    expect(s.totalYards).toBe(Number(m.get("totalYards")));
    expect(s.thirdDown).toEqual(parseMadeAtt(m.get("thirdDownEff")));
    expect(s.plays).not.toBeNull();
    expect(s.yardsPerPlay).toBeCloseTo(s.totalYards / s.plays!, 6);
  });

  it("reports unmatched rows and nulls the advanced fields instead of dropping the team", () => {
    const { stats, unmatched } = normalizeTeamGameStats(gt, []);
    expect(unmatched).toHaveLength(6);
    expect(stats).toHaveLength(6);
    expect(stats[0].plays).toBeNull();
    expect(stats[0].yardsPerPlay).toBeNull();
    expect(stats[0].totalYards).toBeGreaterThan(0);
  });
});
