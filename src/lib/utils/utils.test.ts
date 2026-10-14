import { describe, expect, it } from "vitest";
import type { Team } from "../cfbd/models";
import { teamMatches, normalizeText } from "./search";
import { coverSide, favoriteResult, spreadLabel, totalResult } from "./spread";
import {
  cleanGameClock,
  clockToSeconds,
  etDayKey,
  formatClock,
  formatEtTime,
} from "./time";
import { gameHref, gameSlug, parsePlayerSlug } from "./slug";
import { cleanTv } from "./tv";

describe("spreadLabel", () => {
  it("shows the home team when home is favored", () => {
    expect(spreadLabel(-3.5, "TEX", "OU")).toBe("TEX -3.5");
  });
  it("shows the away team when away is favored (home Oklahoma +7.5)", () => {
    expect(spreadLabel(7.5, "OU", "TEX")).toBe("TEX -7.5");
  });
  it("handles pick'em and missing", () => {
    expect(spreadLabel(0, "A", "B")).toBe("PK");
    expect(spreadLabel(null, "A", "B")).toBeNull();
  });
});

describe("cover", () => {
  it("home covers when it wins by more than the spread", () => {
    expect(coverSide(34, 13, -1.5)).toBe("home");
  });
  it("away covers when home loses and is not the covering side", () => {
    expect(coverSide(14, 30, 7)).toBe("away");
  });
  it("push on an exact number", () => {
    expect(coverSide(20, 13, -7)).toBe("push");
    expect(favoriteResult(20, 13, -7)).toBe("push");
  });
  it("favorite covered / missed", () => {
    expect(favoriteResult(14, 30, 7)).toBe("covered"); // Liberty (away fav) won by 16
    expect(favoriteResult(44, 45, 3)).toBe("missed"); // North Texas (away fav) won by only 1
    expect(favoriteResult(34, 13, -1.5)).toBe("covered");
  });
  it("no favorite for a pick'em", () => {
    expect(favoriteResult(10, 7, 0)).toBeNull();
  });
});

describe("totalResult", () => {
  it("compares the combined score with the line", () => {
    expect(totalResult(44, 45, 56.5)).toBe("over");
    expect(totalResult(10, 13, 49)).toBe("under");
    expect(totalResult(30, 19, 49)).toBe("push");
  });
});

describe("time", () => {
  it("groups by Eastern day, not UTC day", () => {
    // 02:30Z on Oct 11 is 10:30 PM ET on Oct 10.
    expect(etDayKey("2026-10-11T02:30:00.000Z")).toBe("2026-10-10");
    expect(etDayKey("2026-10-10T16:00:00.000Z")).toBe("2026-10-10");
  });
  it("formats ET time (EDT in October, EST in December)", () => {
    expect(formatEtTime("2026-10-07T23:30:00.000Z")).toBe("7:30 PM");
    expect(formatEtTime("2026-12-05T01:00:00.000Z")).toBe("8:00 PM");
  });
  it("shows TBD", () => {
    expect(formatEtTime("2026-10-07T04:00:00.000Z", true)).toBe("TBD");
  });
  it("converts clocks", () => {
    expect(clockToSeconds("34:41")).toBe(2081);
    expect(clockToSeconds(undefined)).toBe(0);
    expect(clockToSeconds("junk")).toBe(0);
    expect(formatClock(2081)).toBe("34:41");
  });
});

describe("cleanTv", () => {
  it("uses the segment before the first pipe", () => {
    expect(cleanTv("CW | The CW Network")).toBe("CW");
    expect(cleanTv("TNT | truTV | HBO Max")).toBe("TNT");
    expect(cleanTv("ESPN2")).toBe("ESPN2");
  });
  it("returns null for empty", () => {
    expect(cleanTv(null)).toBeNull();
    expect(cleanTv("")).toBeNull();
  });
});

describe("team search", () => {
  const sjsu: Team = {
    id: 23,
    school: "San José State",
    mascot: "Spartans",
    abbreviation: "SJSU",
    conference: "Mountain West",
    color: "#000",
    altColor: "#fff",
    alternateNames: ["SJSU", "San Jose State"],
  };
  it("is accent- and case-insensitive", () => {
    expect(normalizeText("José")).toBe("jose");
    expect(teamMatches(sjsu, "JOSE")).toBe(true);
    expect(teamMatches(sjsu, "sjsu")).toBe(true);
    expect(teamMatches(sjsu, "spartan")).toBe(false);
    expect(teamMatches(sjsu, "")).toBe(true);
  });
});

describe("game slug", () => {
  it("puts the id first and reads naturally", () => {
    expect(gameSlug(401862786, "North Texas", "Tulsa")).toBe(
      "401862786-north-texas-at-tulsa",
    );
    expect(gameSlug(1, "San José State", "Texas A&M")).toBe(
      "1-san-jose-state-at-texas-a-m",
    );
  });
  it("round-trips the id and builds the href", () => {
    expect(parsePlayerSlug(gameSlug(401862786, "A", "B"))?.id).toBe(
      "401862786",
    );
    expect(gameHref(7, { school: "Troy" }, { school: "Tulsa" })).toBe(
      "/games/7-troy-at-tulsa",
    );
  });
});

describe("cleanGameClock", () => {
  it("drops the zero padding CFBD puts on the live clock", () => {
    expect(cleanGameClock("00:28")).toBe("0:28");
    expect(cleanGameClock("07:02")).toBe("7:02");
    expect(cleanGameClock("15:00")).toBe("15:00");
  });
  it("is null for missing or malformed input", () => {
    expect(cleanGameClock(null)).toBeNull();
    expect(cleanGameClock("")).toBeNull();
    expect(cleanGameClock("halftime")).toBeNull();
  });
});
