import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import { gamePlayersSchema, gameSchema, driveSchema } from "../schemas";
import type {
  RawAdvancedGameStats,
  RawDrive,
  RawGame,
  RawGamePlayers,
  RawGameLines,
  RawGameTeams,
  RawScoreboardGame,
} from "../schemas";
import {
  fallbackTeam,
  normalizeBoxGame,
  normalizeBoxLine,
  normalizeBoxPlayers,
  normalizeScoringPlays,
  normalizeTeamGameStats,
  withOpponentRows,
} from ".";

const [finalGame, upcoming] = fixture<RawGame[]>("game-games");
const lines = fixture<RawGameLines[]>("game-lines");
const players = fixture<RawGamePlayers[]>("game-players");
const drives = fixture<RawDrive[]>("game-drives");
const advanced = fixture<RawAdvancedGameStats[]>("game-advanced");
const gameTeams = fixture<RawGameTeams[]>("game-teams");
const scoreboard = fixture<RawScoreboardGame[]>("scoreboard");

// Halftime capture: still "in_progress", period 2, clock "00:00", no situation, slices empty.
const halfScoreboard = fixture<RawScoreboardGame[]>("half-scoreboard");

// Real captures from a game in progress (2026-10-07, Jacksonville State at Kennesaw State, Q2).
const liveScoreboard = fixture<RawScoreboardGame[]>("live-scoreboard");
const liveGame = fixture<RawGame[]>("live-games")[0];

const NOW = new Date("2026-10-07T20:00:00Z");
const noRanks = new Map<number, number>();

describe("fixtures match the schemas", () => {
  it("parses every box score response", () => {
    expect(() => gameSchema.parse(finalGame)).not.toThrow();
    expect(() => gameSchema.parse(upcoming)).not.toThrow();
    for (const p of players) gamePlayersSchema.parse(p);
    for (const d of drives) driveSchema.parse(d);
  });
});

describe("normalizeBoxLine", () => {
  it("prefers DraftKings and keeps the home-perspective spread and total", () => {
    const line = normalizeBoxLine(lines.filter((l) => l.id === finalGame.id));
    expect(line).toMatchObject({
      provider: "DraftKings",
      spreadHome: 3,
      spreadOpenHome: 1.5,
      overUnder: 56.5,
      homeMoneyline: 124,
      awayMoneyline: -148,
    });
  });
  it("is null with no lines or no spread", () => {
    expect(normalizeBoxLine([])).toBeNull();
    expect(
      normalizeBoxLine([
        { ...lines[0], lines: [{ ...lines[0].lines[0], spread: null }] },
      ]),
    ).toBeNull();
  });
});

describe("normalizeBoxPlayers", () => {
  const away = normalizeBoxPlayers(players[0], "away", "North Texas");
  const home = normalizeBoxPlayers(players[0], "home", "Tulsa");

  it("makes the four tables in order, reading stats by type name", () => {
    expect(away.map((t) => t.category)).toEqual([
      "passing",
      "rushing",
      "receiving",
      "defense",
    ]);
    const passing = away[0];
    expect(passing.columns.map((c) => c.label)).toEqual([
      "C/ATT",
      "YDS",
      "AVG",
      "TD",
      "INT",
    ]);
    expect(passing.rows[0]).toMatchObject({
      name: "Tayven Jackson",
      values: ["24/39", "332", "8.5", "4", "2"],
    });
  });
  it("sorts by the primary stat (yards, tackles for defense), high to low", () => {
    const rush = home.find((t) => t.category === "rushing")!;
    expect(rush.rows.map((r) => r.name)[0]).toBe("Damari Alston");
    const yards = rush.rows.map((r) => Number(r.values[1]));
    expect(yards).toEqual([...yards].sort((a, b) => b - a));
    const def = home.find((t) => t.category === "defense")!;
    expect(def.rows[0].name).toBe("Chris Thompson Jr.");
    expect(def.columns.at(-2)?.label).toBe("HUR"); // "QB HUR" shown as HUR
  });
  it("keeps CFBD's team-totals row, trimmed, with its negative id", () => {
    const rush = away.find((t) => t.category === "rushing")!;
    const team = rush.rows.find((r) => r.name === "Team");
    expect(team).toMatchObject({
      playerId: "-6952",
      values: ["1", "-2", "-2.0", "0", "0"],
    });
  });
  it("matches the team by homeAway and falls back to the team name", () => {
    expect(normalizeBoxPlayers(players[0], "home", "Nobody")).toEqual(home);
    const noFlag: RawGamePlayers = {
      ...players[0],
      teams: players[0].teams.map((t) => ({ ...t, homeAway: null })),
    };
    expect(normalizeBoxPlayers(noFlag, "home", "Tulsa")).toEqual(home);
  });
  it("is empty for a game with no player data (upcoming)", () => {
    expect(normalizeBoxPlayers(undefined, "home", "Tulsa")).toEqual([]);
  });
});

describe("normalizeScoringPlays", () => {
  const plays = normalizeScoringPlays(drives, finalGame);

  it("keeps only scoring drives, in order, with running home/away scores", () => {
    expect(plays).toHaveLength(14);
    expect(plays[0]).toMatchObject({
      side: "away",
      period: 1,
      clock: "3:06",
      result: "Field goal",
      plays: 15,
      yards: 66,
      elapsed: "7:04",
      homeScore: 0,
      awayScore: 3,
    });
    expect(plays[1]).toMatchObject({
      side: "home",
      result: "Touchdown",
      homeScore: 7,
      awayScore: 3,
    });
  });
  it("ends on the final score", () => {
    expect(plays.at(-1)).toMatchObject({ homeScore: 44, awayScore: 45 });
  });
  it("has no clock or elapsed time in overtime", () => {
    const ot = plays.filter((p) => p.period > 4);
    expect(ot).toHaveLength(2);
    expect(ot.map((p) => p.clock)).toEqual([null, null]);
    expect(ot.every((p) => p.elapsed === null)).toBe(true);
  });
  it("hides every running score when the drive scores do not reconcile", () => {
    const wrongFinal = normalizeScoringPlays(drives, {
      ...finalGame,
      homePoints: 41,
    });
    expect(wrongFinal).toHaveLength(14);
    expect(
      wrongFinal.every((p) => p.homeScore === null && p.awayScore === null),
    ).toBe(true);
    const shuffled = drives.map((d) =>
      d.driveNumber === 7 ? { ...d, endOffenseScore: 1 } : d,
    );
    expect(normalizeScoringPlays(shuffled, finalGame)[0].homeScore).toBeNull();
  });
  it("skips the final-score check while the game is unfinished", () => {
    const live = normalizeScoringPlays(drives.slice(0, 12), {
      ...finalGame,
      homePoints: null,
      awayPoints: null,
    });
    expect(live.at(-1)?.homeScore).not.toBeNull();
  });
  it("is empty for an upcoming game", () => {
    expect(normalizeScoringPlays([], upcoming)).toEqual([]);
  });
});

describe("withOpponentRows + team stats", () => {
  it("mirrors the slice team's row into the opponent's offense", () => {
    const rows = withOpponentRows(advanced);
    expect(rows).toHaveLength(2);
    const nt = rows.find((r) => r.team === "North Texas")!;
    expect(nt.offense.plays).toBe(86);
    expect(nt.offense.successRate).toBeCloseTo(0.3953, 3);
    expect(nt.opponent).toBe("Tulsa");
  });
  it("does not duplicate a row that already exists", () => {
    const both = withOpponentRows(withOpponentRows(advanced));
    expect(both).toHaveLength(2);
  });
  it("joins stats for both teams from one slice", () => {
    const { stats, unmatched } = normalizeTeamGameStats(
      gameTeams,
      withOpponentRows(advanced),
    );
    expect(unmatched).toEqual([]);
    const away = stats.find((s) => s.teamId === finalGame.awayId)!;
    const home = stats.find((s) => s.teamId === finalGame.homeId)!;
    expect(away).toMatchObject({ totalYards: 559, plays: 86, turnovers: 3 });
    expect(home).toMatchObject({ totalYards: 352, plays: 81, turnovers: 0 });
    expect(away.yardsPerPlay).toBeCloseTo(6.5, 1);
  });
  it("leaves advanced fields null when the advanced call came back empty", () => {
    const { stats } = normalizeTeamGameStats(gameTeams, []);
    expect(stats[0].plays).toBeNull();
    expect(stats[0].totalYards).toBeGreaterThan(0);
  });
});

describe("normalizeBoxGame", () => {
  it("is a final with line scores, the spread and the season fields", () => {
    const g = normalizeBoxGame(finalGame, undefined, noRanks, 3, NOW);
    expect(g).toMatchObject({
      id: finalGame.id,
      status: "final",
      season: 2026,
      week: 5,
      seasonType: "regular",
      spreadHome: 3,
    });
    expect(g.home.lineScores).toEqual([0, 17, 7, 14, 6]);
    expect(g.away.points).toBe(45);
  });
  it("is scheduled before kickoff, with null scores", () => {
    const g = normalizeBoxGame(upcoming, undefined, noRanks, null, NOW);
    expect(g.status).toBe("scheduled");
    expect(g.home.points).toBeNull();
    expect(g.spreadHome).toBeNull();
  });
  it("counts an unfinished game as live only within six hours of kickoff", () => {
    const kickoff = Date.parse(upcoming.startDate);
    const during = new Date(kickoff + 2 * 3600_000);
    expect(
      normalizeBoxGame(upcoming, undefined, noRanks, null, during).status,
    ).toBe("live");
    const stale = new Date(kickoff + 7 * 3600_000);
    expect(
      normalizeBoxGame(upcoming, undefined, noRanks, null, stale).status,
    ).toBe("scheduled");
  });
  it("takes live status, clock, TV and fresher scores from the scoreboard", () => {
    const sb: RawScoreboardGame = {
      ...scoreboard.find((s) => s.status === "scheduled")!,
      id: upcoming.id,
      status: "in_progress", // unverified live string: anything not scheduled/completed is live
      period: 3,
      clock: "3:40",
      tv: "ESPN2 | ESPN App",
      homeTeam: {
        ...scoreboard[1].homeTeam,
        points: 24,
        lineScores: [0, 17, 7],
      },
      awayTeam: {
        ...scoreboard[1].awayTeam,
        points: 31,
        lineScores: [3, 7, 21],
      },
    };
    const g = normalizeBoxGame(upcoming, sb, noRanks, null, NOW);
    expect(g).toMatchObject({
      status: "live",
      period: 3,
      clock: "3:40",
      tv: "ESPN2",
    });
    expect(g.home).toMatchObject({ points: 24, lineScores: [0, 17, 7] });
    expect(g.away.points).toBe(31);
  });
  it("ignores the scoreboard for a game /games says is complete", () => {
    const sb = { ...scoreboard[0], id: finalGame.id, status: "scheduled" };
    expect(normalizeBoxGame(finalGame, sb, noRanks, null, NOW).status).toBe(
      "final",
    );
  });
  it("only shows period and clock while live", () => {
    const sb: RawScoreboardGame = {
      ...scoreboard.find((s) => s.status === "scheduled")!,
      id: upcoming.id,
      period: 2,
      clock: "1:00",
    };
    const g = normalizeBoxGame(upcoming, sb, noRanks, null, NOW);
    expect(g.status).toBe("scheduled");
    expect(g.period).toBeNull();
    expect(g.clock).toBeNull();
  });
});

describe("fallbackTeam", () => {
  it("gives an FCS opponent a name-only team with a neutral accent", () => {
    expect(fallbackTeam(99, "Eastern Illinois", "Ohio Valley")).toMatchObject({
      id: 99,
      school: "Eastern Illinois",
      abbreviation: "EAST",
      conference: "Ohio Valley",
    });
  });
});

describe("a real live game (captured from CFBD)", () => {
  const sb = liveScoreboard.find((g) => g.id === liveGame.id)!;

  it("/games has no scores or line scores while the game is on", () => {
    expect(liveGame.completed).toBe(false);
    expect(liveGame.homePoints).toBeNull();
    expect(liveGame.homeLineScores).toBeNull();
  });
  it("the live status is in_progress, with a zero-padded clock and a situation", () => {
    expect(sb.status).toBe("in_progress");
    const g = normalizeBoxGame(liveGame, sb, noRanks, 3, NOW);
    expect(g.status).toBe("live");
    expect(g.period).toBe(sb.period);
    // "00:23" style clocks lose the leading zero
    expect(g.clock).toBe(sb.clock!.replace(/^0/, ""));
    expect(g.situation).toBe(sb.situation ?? null);
    expect(g.tv).toBe("CBSSN");
  });
  it("scores and line scores come from the scoreboard, not /games", () => {
    const g = normalizeBoxGame(liveGame, sb, noRanks, 3, NOW);
    expect(g.home.points).toBe(sb.homeTeam.points);
    expect(g.away.lineScores).toEqual(sb.awayTeam.lineScores);
    expect(g.home.points).not.toBeNull();
  });
  it("every slice endpoint is empty mid-game, and the normalizers cope", () => {
    for (const name of [
      "live-games-teams",
      "live-games-players",
      "live-drives",
      "live-advanced",
    ]) {
      expect(fixture<unknown[]>(name)).toEqual([]);
    }
    expect(normalizeBoxPlayers(undefined, "home", liveGame.homeTeam)).toEqual(
      [],
    );
    expect(normalizeScoringPlays([], liveGame)).toEqual([]);
    const { stats } = normalizeTeamGameStats([], withOpponentRows([]));
    expect(stats).toEqual([]);
  });
  it("without the scoreboard it is still live (kickoff under six hours ago)", () => {
    const during = new Date(Date.parse(liveGame.startDate) + 3600_000);
    const g = normalizeBoxGame(liveGame, undefined, noRanks, null, during);
    expect(g.status).toBe("live");
    expect(g.clock).toBeNull();
  });
  it("halftime is still in_progress: period 2, a 0:00 clock, no situation, empty slices", () => {
    const half = halfScoreboard.find((g) => g.id === liveGame.id)!;
    expect(half.status).toBe("in_progress");
    const g = normalizeBoxGame(liveGame, half, noRanks, 3, NOW);
    expect(g).toMatchObject({
      status: "live",
      period: 2,
      clock: "0:00",
      situation: null,
    });
    for (const name of [
      "half-games-teams",
      "half-games-players",
      "half-drives",
      "half-advanced",
    ]) {
      expect(fixture<unknown[]>(name)).toEqual([]);
    }
  });
});
