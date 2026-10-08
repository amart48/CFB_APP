import { describe, expect, it } from "vitest";
import { fixture } from "@/test-utils";
import type { PlayerStatRow, Team } from "../cfbd/models";
import {
  activeSeasons,
  buildPlayerBio,
  classLabel,
  formatHeight,
  playerCategoryStats,
  playerGameLog,
  playerPpa,
  playerStints,
  playerUsage,
  primaryCategory,
  teamForSeason,
} from "../cfbd/normalize";
import type {
  RawPlayerSearch,
  RawPlayerStat,
  RawPlayerUsage,
  RawPpaPlayerGame,
  RawPpaPlayerSeason,
  RawRosterPlayer,
} from "../cfbd/schemas";
import {
  parsePlayerSlug,
  playerHref,
  playerSlug,
  slugify,
} from "../utils/slug";
import { CATEGORY_BY_ID } from "./categories";
import { rankPlayer } from "./rank";

const ID = "4870906";
const roster = fixture<RawRosterPlayer[]>("roster");
const search = fixture<RawPlayerSearch[]>("player-search")[0];
const stats = fixture<RawPlayerStat[]>("player-team-stats");

describe("slugs", () => {
  it("slugifies names, dropping accents and punctuation", () => {
    expect(slugify("José Ruiz Jr.")).toBe("jose-ruiz-jr");
    expect(slugify("D'Andre  Swift")).toBe("d-andre-swift");
    expect(slugify("---")).toBe("");
  });
  it("builds and parses player slugs", () => {
    expect(playerSlug(ID, "Arch Manning")).toBe("4870906-arch-manning");
    expect(playerSlug("12", "???")).toBe("12");
    expect(parsePlayerSlug("4870906-arch-manning")).toEqual({
      id: ID,
      name: "arch manning",
    });
    expect(parsePlayerSlug("12")).toEqual({ id: "12", name: "" });
    expect(parsePlayerSlug("arch-manning")).toBeNull();
    expect(parsePlayerSlug("%E0%A4%A")).toBeNull(); // malformed encodings must not throw
  });
  it("links carry the team and season", () => {
    const href = playerHref(
      { playerId: ID, name: "Arch Manning", team: { school: "Texas A&M" } },
      2025,
    );
    expect(href).toBe(
      "/players/4870906-arch-manning?team=Texas+A%26M&season=2025",
    );
    expect(
      playerHref(
        { playerId: ID, name: "Arch Manning", team: { school: "Texas" } },
        null,
      ),
    ).toBe("/players/4870906-arch-manning?team=Texas");
  });
});

describe("bio", () => {
  it("formats height and class", () => {
    expect(formatHeight(76)).toBe(`6'4"`);
    expect(formatHeight(null)).toBeNull();
    expect(classLabel(3)).toBe("Junior");
    expect(classLabel(5)).toBe("Graduate");
    expect(classLabel(9)).toBeNull();
    expect(classLabel(undefined)).toBeNull();
  });
  it("merges roster and search data", () => {
    const bio = buildPlayerBio(
      ID,
      roster.find((p) => p.id === ID),
      search,
    )!;
    expect(bio.name).toBe("Arch Manning");
    expect(bio).toMatchObject({
      position: "QB",
      jersey: 16,
      classYear: "Junior",
      heightInches: 76,
      weightLbs: 222,
    });
    expect(bio.hometown).toBe("New Orleans, LA");
  });
  it("falls back to search data when the roster has no entry, and to null with neither", () => {
    const bio = buildPlayerBio(ID, undefined, search)!;
    expect(bio.classYear).toBeNull();
    expect(bio.hometown).toBe(search.hometown);
    expect(buildPlayerBio(ID, undefined, undefined)).toBeNull();
  });
});

describe("stints and seasons", () => {
  const stints = playerStints(search);
  it("finds the team for a season and the active seasons", () => {
    expect(stints).toEqual([{ team: "Texas", startYear: 2023, endYear: 2026 }]);
    expect(teamForSeason(stints, 2025)).toBe("Texas");
    expect(teamForSeason(stints, 2022)).toBeNull();
    expect(activeSeasons(stints, 2026)).toEqual([2023, 2024, 2025, 2026]);
    expect(activeSeasons(stints, 2024)).toEqual([2023, 2024]); // never beyond the current season
  });
  it("handles transfers across two teams", () => {
    const two = [
      { team: "B", startYear: 2024, endYear: 2025 },
      { team: "A", startYear: 2022, endYear: 2023 },
    ];
    const s = playerStints({ ...search, teamStints: two });
    expect(s.map((x) => x.team)).toEqual(["A", "B"]);
    expect(teamForSeason(s, 2024)).toBe("B");
    expect(activeSeasons(s, 2030)).toEqual([2022, 2023, 2024, 2025]);
    expect(playerStints(undefined)).toEqual([]);
  });
});

describe("category stats", () => {
  it("groups one player's stats by category in leaderboard order and skips fumbles", () => {
    const cats = playerCategoryStats(stats, ID);
    expect(cats.map((c) => c.category)).toEqual(["passing", "rushing"]);
    const passing = cats[0].stats;
    const raw = (type: string) =>
      Number(
        stats.find(
          (r) =>
            r.playerId === ID &&
            r.category === "passing" &&
            r.statType === type,
        )!.stat,
      );
    expect(passing.YDS).toBe(raw("YDS"));
    expect(passing.PCT).toBe(raw("PCT"));
  });
  it("ignores other players and returns nothing for an unknown id", () => {
    expect(playerCategoryStats(stats, "does-not-exist")).toEqual([]);
    expect(
      playerCategoryStats(stats, "4685268").map((c) => c.category),
    ).toEqual(["rushing", "receiving"]);
  });
  it("picks the primary category by position, falling back to what they have", () => {
    expect(primaryCategory("QB", ["rushing", "passing"])).toBe("passing");
    expect(primaryCategory("QB", ["rushing"])).toBe("rushing");
    expect(primaryCategory("LB", ["defensive", "interceptions"])).toBe(
      "defensive",
    );
    expect(primaryCategory("ATH", ["receiving", "kickReturns"])).toBe(
      "receiving",
    );
    expect(primaryCategory("QB", [])).toBeNull();
  });
});

describe("ppa, usage and game log", () => {
  it("reads the player's splits", () => {
    const ppa = playerPpa(
      fixture<RawPpaPlayerSeason[]>("ppa-player-season"),
      ID,
    )!;
    expect(ppa.all).not.toBeNull();
    expect(Object.keys(ppa)).toHaveLength(8);
    const usage = playerUsage(fixture<RawPlayerUsage[]>("player-usage"), ID)!;
    expect(usage.pass).toBeGreaterThan(0);
    expect(usage.all).toBeGreaterThan(0);
    expect(usage.all).toBeLessThanOrEqual(1);
    expect(playerPpa([], ID)).toBeNull();
    expect(
      playerUsage(fixture<RawPlayerUsage[]>("player-usage"), "nope"),
    ).toBeNull();
  });
  it("sorts the game log by week", () => {
    const log = playerGameLog(
      fixture<RawPpaPlayerGame[]>("ppa-player-games"),
      ID,
    );
    expect(log.map((g) => g.week)).toEqual([1, 2, 3, 4]);
    expect(log[0].opponent).toBe("Texas State");
    expect(playerGameLog([], ID)).toEqual([]);
  });
});

describe("rankPlayer", () => {
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
  const row = (
    id: string,
    yds: number,
    int: number,
    qualified = true,
    teamId = 1,
  ): PlayerStatRow => ({
    playerId: id,
    name: id,
    position: "QB",
    team: team(teamId),
    stats: { YDS: yds, INT: int },
    qualified,
  });
  const passing = CATEGORY_BY_ID.get("passing")!;
  const rows = [
    row("a", 1000, 5),
    row("b", 900, 0),
    row("c", 900, 2),
    row("d", 2000, 0, false),
    row("e", 500, 1),
  ];

  it("ranks among qualified players only (high is better)", () => {
    expect(rankPlayer(rows, passing, "a", 1).YDS).toEqual({ rank: 1, of: 4 });
    expect(rankPlayer(rows, passing, "e", 1).YDS).toEqual({ rank: 4, of: 4 });
  });
  it("shares a rank on ties and counts fewer-is-better columns the other way", () => {
    expect(rankPlayer(rows, passing, "b", 1).YDS?.rank).toBe(2);
    expect(rankPlayer(rows, passing, "c", 1).YDS?.rank).toBe(2);
    expect(rankPlayer(rows, passing, "b", 1).INT?.rank).toBe(1); // 0 interceptions is best
    expect(rankPlayer(rows, passing, "a", 1).INT?.rank).toBe(4);
  });
  it("returns null for unqualified or missing players and for stats they lack", () => {
    expect(rankPlayer(rows, passing, "d", 1).YDS).toBeNull();
    expect(rankPlayer(rows, passing, "zzz", 1).YDS).toBeNull();
    expect(rankPlayer(rows, passing, "a", 1).ATT).toBeNull();
  });
  it("keys on team too, so a transfer is ranked for the right stint", () => {
    const moved = [
      row("m", 800, 1, true, 1),
      row("m", 100, 0, true, 2),
      row("x", 700, 0),
    ];
    expect(rankPlayer(moved, passing, "m", 2).YDS?.rank).toBe(3);
    expect(rankPlayer(moved, passing, "m", 1).YDS?.rank).toBe(1);
  });
});
