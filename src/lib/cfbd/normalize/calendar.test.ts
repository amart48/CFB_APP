import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import type { RawCalendarWeek } from "../schemas";
import { currentWeek } from ".";

const calendar = fixture<RawCalendarWeek[]>("calendar");

describe("currentWeek", () => {
  it("picks the window containing now (2026-10-07 is week 6)", () => {
    expect(currentWeek(calendar, new Date("2026-10-07T15:00:00Z"))).toEqual({
      year: 2026,
      week: 6,
      seasonType: "regular",
    });
  });
  it("handles the boundary: endDate is exclusive", () => {
    expect(currentWeek(calendar, new Date("2026-10-12T07:00:00Z"))?.week).toBe(
      7,
    );
  });
  it("uses postseason after the regular season ends", () => {
    expect(
      currentWeek(calendar, new Date("2026-12-20T12:00:00Z"))?.seasonType,
    ).toBe("postseason");
  });
  it("falls back to the last started week after the season, and first week before it", () => {
    expect(
      currentWeek(calendar, new Date("2027-03-01T00:00:00Z"))?.seasonType,
    ).toBe("postseason");
    expect(currentWeek(calendar, new Date("2026-06-01T00:00:00Z"))?.week).toBe(
      1,
    );
  });
  it("returns null for an empty calendar", () => {
    expect(currentWeek([], new Date())).toBeNull();
  });
});
