import { describe, expect, it } from "vitest";
import type { BoxLine, BoxScore, GameRow, Team } from "../cfbd/models";
import {
  buildLineCells,
  driveDetail,
  formatMoneyline,
  lineScoreCells,
  lineScoreColumns,
  overtimeLabel,
  periodHeading,
  playPeriod,
} from "./format";

const team = (id: number, abbreviation: string): Team => ({
  id,
  school: abbreviation,
  mascot: "",
  abbreviation,
  conference: "",
  color: "#000000",
  altColor: "#ffffff",
  alternateNames: [],
});
const away = team(1, "UNT");
const home = team(2, "TLSA");

const game = (o: Partial<GameRow> = {}): BoxScore["game"] => ({
  id: 1,
  startUtc: "2026-10-02T01:00:00.000Z",
  startTbd: false,
  status: "final",
  period: null,
  clock: null,
  home: { teamId: 2, points: 44, apRank: null, lineScores: [0, 17, 7, 14, 6] },
  away: { teamId: 1, points: 45, apRank: null, lineScores: [3, 7, 21, 7, 7] },
  tv: null,
  spreadHome: 3,
  overUnder: null,
  neutralSite: false,
  venue: "",
  conferenceGame: true,
  season: 2026,
  week: 5,
  seasonType: "regular",
  ...o,
});
const line = (o: Partial<BoxLine> = {}): BoxLine => ({
  provider: "DraftKings",
  spreadHome: 3,
  spreadOpenHome: 1.5,
  overUnder: 56.5,
  homeMoneyline: 124,
  awayMoneyline: -148,
  ...o,
});
const box = (g = game(), l: BoxLine | null = line()): BoxScore => ({
  game: g,
  attendance: null,
  away,
  home,
  fbs: { away: true, home: true },
  awayStats: null,
  homeStats: null,
  awayPlayers: [],
  homePlayers: [],
  scoring: [],
  line: l,
});

describe("period helpers", () => {
  it("labels overtime from the line score length", () => {
    expect(overtimeLabel([1, 2, 3, 4])).toBeNull();
    expect(overtimeLabel([1, 2, 3, 4, 5])).toBe("OT");
    expect(overtimeLabel([1, 2, 3, 4, 5, 6])).toBe("2 OT");
    expect(overtimeLabel(null)).toBeNull();
  });
  it("headings and cells", () => {
    expect([1, 4, 5, 6].map(periodHeading)).toEqual(["1", "4", "OT", "2OT"]);
    expect(lineScoreCells([3, 7, 21], 4)).toEqual([3, 7, 21, null]);
    expect(lineScoreCells(null, 4)).toEqual([null, null, null, null]);
    expect(lineScoreColumns(box())).toBe(5);
    expect(
      lineScoreColumns(
        box(
          game({
            home: { ...game().home, lineScores: null },
            away: { ...game().away, lineScores: [1, 2] },
          }),
        ),
      ),
    ).toBe(4);
  });
  it("formats a scoring drive", () => {
    expect(playPeriod({ period: 2, clock: "13:15" })).toBe("Q2 13:15");
    expect(playPeriod({ period: 5, clock: null })).toBe("OT");
    expect(driveDetail({ plays: 12, yards: 75, elapsed: "4:51" })).toBe(
      "12 plays, 75 yds, 4:51",
    );
    expect(driveDetail({ plays: 1, yards: 18, elapsed: null })).toBe(
      "1 play, 18 yds",
    );
  });
  it("signs moneylines", () => {
    expect(formatMoneyline(124)).toBe("+124");
    expect(formatMoneyline(-148)).toBe("-148");
  });
});

describe("buildLineCells", () => {
  const byLabel = (cells: ReturnType<typeof buildLineCells>) =>
    Object.fromEntries(cells!.map((c) => [c.label, c]));

  it("is null with no line", () => {
    expect(buildLineCells(box(game(), null))).toBeNull();
  });
  it("labels the favorite, and reports that the favorite missed (underdog covered)", () => {
    const c = byLabel(buildLineCells(box()));
    expect(c.SPREAD).toMatchObject({ value: "UNT -3", sub: "DraftKings" });
    // UNT (away) favored by 3 but won by 1: favorite missed, TLSA covered
    expect(c["AGAINST THE SPREAD"]).toEqual({
      label: "AGAINST THE SPREAD",
      value: "Missed",
      sub: "TLSA covered",
    });
    expect(c.TOTAL.value).toBe("56.5");
    expect(c["TOTAL RESULT"]).toMatchObject({ value: "Over", sub: "89 pts" });
    expect(c.MONEYLINE.value).toBe("UNT -148 · TLSA +124");
  });
  it("home favorite covering", () => {
    const g = game({
      home: { ...game().home, points: 31 },
      away: { ...game().away, points: 17 },
    });
    const c = byLabel(buildLineCells(box(g, line({ spreadHome: -7 }))));
    expect(c.SPREAD.value).toBe("TLSA -7");
    expect(c["AGAINST THE SPREAD"]).toMatchObject({
      value: "Covered",
      sub: "TLSA covered",
    });
  });
  it("push on the spread and on the total", () => {
    const g = game({
      home: { ...game().home, points: 30 },
      away: { ...game().away, points: 27 },
    });
    const c = byLabel(
      buildLineCells(box(g, line({ spreadHome: -3, overUnder: 57 }))),
    );
    expect(c["AGAINST THE SPREAD"]).toMatchObject({ value: "Push" });
    expect(c["AGAINST THE SPREAD"].sub).toBeUndefined();
    expect(c["TOTAL RESULT"]).toMatchObject({ value: "Push", sub: "57 pts" });
  });
  it("under, and a pick'em", () => {
    const c = byLabel(
      buildLineCells(box(game(), line({ spreadHome: 0, overUnder: 100 }))),
    );
    expect(c.SPREAD.value).toBe("PK");
    expect(c["TOTAL RESULT"].value).toBe("Under");
    expect(c["AGAINST THE SPREAD"]).toMatchObject({
      value: "Covered",
      sub: "UNT covered",
    });
  });
  it("shows no results before the game ends, and null moneylines are skipped", () => {
    const upcoming = game({
      status: "scheduled",
      home: { ...game().home, points: null, lineScores: null },
      away: { ...game().away, points: null, lineScores: null },
    });
    const c = byLabel(
      buildLineCells(box(upcoming, line({ homeMoneyline: null }))),
    );
    expect(c["AGAINST THE SPREAD"].value).toBe("—");
    expect(c["TOTAL RESULT"].value).toBe("—");
    expect(c.MONEYLINE.value).toBe("UNT -148");
    const live = byLabel(buildLineCells(box(game({ status: "live" }))));
    expect(live["AGAINST THE SPREAD"].value).toBe("In progress");
  });
  it("handles a line with no spread or total", () => {
    const c = byLabel(
      buildLineCells(
        box(
          game(),
          line({
            spreadHome: null,
            overUnder: null,
            homeMoneyline: null,
            awayMoneyline: null,
          }),
        ),
      ),
    );
    expect(c.SPREAD.value).toBe("—");
    expect(c.TOTAL.value).toBe("—");
    expect(c.MONEYLINE.value).toBe("—");
  });
});
