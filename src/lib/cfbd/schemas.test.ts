import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  advancedResponse,
  calendarResponse,
  coachesResponse,
  gameTeamsResponse,
  gamesResponse,
  linesResponse,
  rankingsResponse,
  playerSearchResponse,
  ppaTeamGamesResponse,
  playerStatsResponse,
  playerUsageResponse,
  ppaPlayerGamesResponse,
  ppaPlayerSeasonResponse,
  rosterResponse,
  recordsResponse,
  seasonAdvancedResponse,
  seasonStatsResponse,
  spRatingsResponse,
  scoreboardResponse,
  teamsResponse,
} from "./schemas";

function fixture(name: string): unknown {
  const file = path.join(process.cwd(), "fixtures", `${name}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

describe("raw CFBD schemas accept saved fixtures", () => {
  it.each([
    ["teams-fbs", teamsResponse],
    ["calendar", calendarResponse],
    ["scoreboard", scoreboardResponse],
    ["games", gamesResponse],
    ["lines", linesResponse],
    ["rankings", rankingsResponse],
    ["games-teams", gameTeamsResponse],
    ["stats-game-advanced", advancedResponse],
    ["ratings-sp", spRatingsResponse],
    ["stats-season-advanced", seasonAdvancedResponse],
    ["stats-season", seasonStatsResponse],
    ["records", recordsResponse],
    ["games-season", gamesResponse],
    ["player-stats-season", playerStatsResponse],
    ["roster", rosterResponse],
    ["team-games", gamesResponse],
    ["team-record", recordsResponse],
    ["coaches", coachesResponse],
    ["ppa-team-games", ppaTeamGamesResponse],
    ["roster-team", rosterResponse],
    ["team-player-stats", playerStatsResponse],
    ["player-search", playerSearchResponse],
    ["ppa-player-season", ppaPlayerSeasonResponse],
    ["player-usage", playerUsageResponse],
    ["ppa-player-games", ppaPlayerGamesResponse],
    ["player-team-stats", playerStatsResponse],
    ["player-team-stats-prev", playerStatsResponse],
  ] as const)("%s", (name, schema) => {
    const result = schema.safeParse(fixture(name));
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("rejects a response with the wrong shape", () => {
    expect(gamesResponse.safeParse([{ id: "not-a-number" }]).success).toBe(
      false,
    );
  });
});
