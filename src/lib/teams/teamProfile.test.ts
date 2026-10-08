import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import type { Team, TeamSeasonRow } from "../cfbd/models";
import {
  formatSplit,
  headCoach,
  inRosterFilter,
  normalizeRoster,
  normalizeSchedule,
  normalizeTeamPpaGames,
  normalizeTeamRecord,
  positionGroup,
  teamLeaders,
} from "../cfbd/normalize";
import type {
  RawCoach,
  RawGame,
  RawPlayerStat,
  RawPpaTeamGame,
  RawRecord,
  RawRosterPlayer,
} from "../cfbd/schemas";
import { teamHref, teamSlug } from "../utils/slug";
import { rankTeam } from "./rank";

const TEXAS = 251;
const games = fixture<RawGame[]>("team-games");

describe("normalizeSchedule", () => {
  const sched = normalizeSchedule(games, TEXAS);

  it("returns every game in date order from Texas's point of view", () => {
    expect(sched).toHaveLength(12);
    const dates = sched.map((g) => Date.parse(g.startUtc));
    expect([...dates].sort((a, b) => a - b)).toEqual(dates);
    expect(sched[0]).toMatchObject({
      week: 1,
      opponent: { id: 326, name: "Texas State" },
      site: "home",
    });
  });

  it("derives W/L from the right side's points, and leaves unplayed games empty", () => {
    const played = sched.filter((g) => g.completed);
    expect(played.length).toBeGreaterThan(0);
    for (const g of played) {
      expect(g.result).toBe(
        g.pointsFor! > g.pointsAgainst!
          ? "W"
          : g.pointsFor! < g.pointsAgainst!
            ? "L"
            : "T",
      );
    }
    const upcoming = sched.filter((g) => !g.completed);
    expect(
      upcoming.every((g) => g.result === null && g.pointsFor === null),
    ).toBe(true);
  });

  it("flips points for an away game and marks neutral sites", () => {
    const raw = games.find((g) => g.awayId === TEXAS && !g.neutralSite);
    if (raw && raw.completed) {
      const row = sched.find((g) => g.gameId === raw.id)!;
      expect(row.pointsFor).toBe(raw.awayPoints);
      expect(row.site).toBe("away");
    }
    const neutral = sched.find((g) => g.site === "neutral")!;
    expect(neutral.opponent.name).toBe("Oklahoma"); // Texas is listed as the AWAY label here
  });

  it("keeps TBD start times and handles ties", () => {
    expect(sched.some((g) => g.startTbd)).toBe(true);
    const tie: RawGame = { ...games[0], homePoints: 10, awayPoints: 10 };
    expect(normalizeSchedule([tie], TEXAS)[0].result).toBe("T");
  });

  it("ignores games the team is not in", () => {
    expect(normalizeSchedule(games, 999999)).toEqual([]);
  });
});

describe("record and coach", () => {
  const record = normalizeTeamRecord(
    fixture<RawRecord[]>("team-record"),
    TEXAS,
  );
  it("reads overall, conference, home and away splits and expected wins", () => {
    expect(record.overall).toEqual({ wins: 4, losses: 0, ties: 0 });
    expect(record.conference?.wins).toBe(1);
    expect(record.home?.wins).toBe(3);
    expect(record.away?.wins).toBe(1);
    expect(record.expectedWins).toBeGreaterThan(0);
  });
  it("is all null for an unknown team and formats splits", () => {
    expect(normalizeTeamRecord([], TEXAS)).toEqual({
      overall: null,
      conference: null,
      home: null,
      away: null,
      expectedWins: null,
    });
    expect(formatSplit({ wins: 4, losses: 0, ties: 0 })).toBe("4-0");
    expect(formatSplit({ wins: 5, losses: 1, ties: 1 })).toBe("5-1-1");
    expect(formatSplit(null)).toBe("—");
  });
  it("finds the head coach, preferring the one with the most games in a mid-season change", () => {
    const coaches = fixture<RawCoach[]>("coaches");
    expect(headCoach(coaches, "Texas", 2026)).toBe("Steve Sarkisian");
    expect(headCoach(coaches, "Texas", 1999)).toBeNull();
    const interim: RawCoach = {
      id: 2,
      firstName: "Ian",
      lastName: "Interim",
      seasons: [{ school: "Texas", year: 2026, games: 7 }],
    };
    const fired: RawCoach = {
      id: 3,
      firstName: "Fred",
      lastName: "Fired",
      seasons: [{ school: "Texas", year: 2026, games: 5 }],
    };
    expect(headCoach([fired, interim], "Texas", 2026)).toBe("Ian Interim");
  });
});

describe("per-game PPA", () => {
  it("sorts by week and keeps offense and defense separate", () => {
    const rows = normalizeTeamPpaGames(
      fixture<RawPpaTeamGame[]>("ppa-team-games"),
    );
    expect(rows.map((r) => r.week)).toEqual(
      [...rows.map((r) => r.week)].sort((a, b) => a - b),
    );
    expect(rows[0]).toMatchObject({ week: 1, opponent: "Texas State" });
    expect(rows[0].offense).toBeCloseTo(0.46, 2);
    expect(rows[0].defense).toBeCloseTo(-0.01, 2);
  });
});

describe("roster", () => {
  const raw = fixture<RawRosterPlayer[]>("roster-team");
  const roster = normalizeRoster(raw);
  it("maps positions to groups", () => {
    expect(positionGroup("QB")).toBe("QB");
    expect(positionGroup("EDGE")).toBe("DL");
    expect(positionGroup("ss")).toBe("DB");
    expect(positionGroup("PK")).toBe("ST");
    expect(positionGroup("ATH")).toBe("OTHER");
    expect(positionGroup(undefined)).toBe("OTHER");
  });
  it("sorts by position group, then jersey", () => {
    expect(roster).toHaveLength(raw.length);
    expect(roster[0].group).toBe("QB");
    const order = [
      "QB",
      "RB",
      "WR",
      "TE",
      "OL",
      "DL",
      "LB",
      "DB",
      "ST",
      "OTHER",
    ];
    const idx = roster.map((p) => order.indexOf(p.group));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    const qbs = roster
      .filter((p) => p.group === "QB")
      .map((p) => p.jersey ?? 999);
    expect([...qbs].sort((a, b) => a - b)).toEqual(qbs);
  });
  it("builds names, class and hometown", () => {
    const arch = roster.find((p) => p.name === "Arch Manning")!;
    expect(arch).toMatchObject({
      jersey: 16,
      position: "QB",
      classYear: "Junior",
      heightInches: 76,
      hometown: "New Orleans, LA",
    });
  });
  it("filters by side of the ball", () => {
    const arch = roster.find((p) => p.name === "Arch Manning")!;
    expect(inRosterFilter(arch, "all")).toBe(true);
    expect(inRosterFilter(arch, "offense")).toBe(true);
    expect(inRosterFilter(arch, "defense")).toBe(false);
    expect(
      roster
        .filter((p) => inRosterFilter(p, "special"))
        .every((p) => p.group === "ST"),
    ).toBe(true);
    expect(
      roster.filter((p) => inRosterFilter(p, "defense")).length,
    ).toBeGreaterThan(0);
  });
  it("handles missing fields", () => {
    const [p] = normalizeRoster([
      {
        id: "1",
        firstName: "A",
        lastName: null,
        position: null,
      } as RawRosterPlayer,
    ]);
    expect(p).toMatchObject({
      name: "A",
      jersey: null,
      group: "OTHER",
      hometown: null,
      classYear: null,
    });
  });
});

describe("teamLeaders", () => {
  const stats = fixture<RawPlayerStat[]>("team-player-stats");
  const leaders = teamLeaders(stats);
  const byKey = Object.fromEntries(leaders.map((l) => [l.key, l]));

  it("picks the top player in each headline stat", () => {
    expect(leaders.length).toBeGreaterThanOrEqual(4);
    const passers = stats
      .filter((r) => r.category === "passing" && r.statType === "YDS")
      .map((r) => Number(r.stat));
    expect(byKey.passing.value).toBe(Math.max(...passers));
    expect(byKey.passing.unit).toBe("yds");
    expect(byKey.passing.detail).toMatch(/^\d+ TD · \d+ INT$/);
    const tackles = stats
      .filter((r) => r.category === "defensive" && r.statType === "TOT")
      .map((r) => Number(r.stat));
    expect(byKey.tackles.value).toBe(Math.max(...tackles));
  });
  it("skips stats nobody has and breaks ties by name", () => {
    expect(teamLeaders([])).toEqual([]);
    const row = (id: string, name: string, yds: string): RawPlayerStat => ({
      season: 2026,
      playerId: id,
      player: name,
      position: "RB",
      team: "T",
      conference: "C",
      category: "rushing",
      statType: "YDS",
      stat: yds,
    });
    expect(teamLeaders([row("1", "Zed", "0")])).toEqual([]);
    expect(
      teamLeaders([row("1", "Zed", "100"), row("2", "Amy", "100")])[0].name,
    ).toBe("Amy");
  });
  it("does not mix categories (a QB's rushing yards do not lead rushing unless highest)", () => {
    const rushers = stats
      .filter((r) => r.category === "rushing" && r.statType === "YDS")
      .map((r) => Number(r.stat));
    expect(byKey.rushing.value).toBe(Math.max(...rushers));
  });
});

describe("rankTeam", () => {
  const team = (id: number): Team => ({
    id,
    school: "T" + id,
    mascot: "",
    abbreviation: "T",
    conference: "SEC",
    color: "#000",
    altColor: "#fff",
    alternateNames: [],
  });
  const side = (ppa: number | null) => ({
    ppa,
    successRate: 0.5,
    explosiveness: 1,
    yardsPerPlay: 6,
    pointsPerGame: 30,
  });
  const row = (
    id: number,
    sp: number | null,
    offPpa: number | null,
    defPpa: number | null,
  ): TeamSeasonRow => ({
    team: team(id),
    record: null,
    spOverall: sp,
    spOffense: sp,
    spDefense: sp,
    off: side(offPpa),
    def: side(defPpa),
  });
  const rows = [
    row(1, 30, 0.5, 0.1),
    row(2, 20, 0.4, -0.1),
    row(3, 20, 0.4, 0.3),
    row(4, null, null, null),
  ];

  it("ranks high-is-better columns descending and ties share the better rank", () => {
    expect(rankTeam(rows, 1).spOverall).toEqual({ rank: 1, of: 3 });
    expect(rankTeam(rows, 2).spOverall).toEqual({ rank: 2, of: 3 });
    expect(rankTeam(rows, 3).spOverall).toEqual({ rank: 2, of: 3 });
  });
  it("ranks lower-is-better defense columns ascending", () => {
    expect(rankTeam(rows, 2).defPpa?.rank).toBe(1);
    expect(rankTeam(rows, 3).defPpa?.rank).toBe(3);
    expect(rankTeam(rows, 2).spDefense).toEqual({ rank: 1, of: 3 }); // SP+ defense: lower is better; ties with team 3 share rank 1
    expect(rankTeam(rows, 1).spDefense).toEqual({ rank: 3, of: 3 });
  });
  it("returns null for a team with no value, and for an unknown team", () => {
    expect(rankTeam(rows, 4).spOverall).toBeNull();
    expect(rankTeam(rows, 99).spOverall).toBeNull();
  });
  it("leaves out the non-numeric columns", () => {
    const keys = Object.keys(rankTeam(rows, 1));
    expect(keys).not.toContain("team");
    expect(keys).not.toContain("rec");
  });
});

describe("team links", () => {
  it("builds slugs and hrefs", () => {
    expect(teamSlug(251, "Texas")).toBe("251-texas");
    expect(teamSlug(2005, "San José State")).toBe("2005-san-jose-state");
    expect(teamHref({ id: 251, school: "Texas" })).toBe("/teams/251-texas");
    expect(teamHref({ id: 251, school: "Texas" }, 2025)).toBe(
      "/teams/251-texas?season=2025",
    );
  });
});
