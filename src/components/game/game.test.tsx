// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatPanel } from "@/components/scoreboard/StatPanel";
import { SchedulePanel } from "@/components/team/SchedulePanel";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import type { BoxScore, ScheduleRow, Team } from "@/lib/cfbd/models";
import {
  normalizeBoxGame,
  normalizeBoxLine,
  normalizeBoxPlayers,
  normalizeScoringPlays,
  normalizeTeamGameStats,
  withOpponentRows,
} from "@/lib/cfbd/normalize";
import type {
  RawAdvancedGameStats,
  RawDrive,
  RawGame,
  RawGameLines,
  RawGamePlayers,
  RawGameTeams,
} from "@/lib/cfbd/schemas";
import { fixture } from "@/test-utils";
import { GameHeader } from "./GameHeader";
import { LineStrip } from "./LineStrip";
import { PlayerPanels } from "./PlayerPanels";
import { ScoringSummary } from "./ScoringSummary";
import { TeamStatsPanel } from "./TeamStatsPanel";

vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));

const [finalGame, upcoming] = fixture<RawGame[]>("game-games");
const lines = fixture<RawGameLines[]>("game-lines");
const players = fixture<RawGamePlayers[]>("game-players");
const drives = fixture<RawDrive[]>("game-drives");
const advanced = fixture<RawAdvancedGameStats[]>("game-advanced");
const gameTeams = fixture<RawGameTeams[]>("game-teams");

const team = (id: number, school: string, abbreviation: string): Team => ({
  id,
  school,
  mascot: "",
  abbreviation,
  conference: "American Athletic",
  color: "#00853e",
  altColor: "#ffffff",
  alternateNames: [],
});
const away = team(249, "North Texas", "UNT");
const home = team(202, "Tulsa", "TLSA");
const NOW = new Date("2026-10-07T20:00:00Z");

function finalBox(): BoxScore {
  const line = normalizeBoxLine(lines.filter((l) => l.id === finalGame.id));
  const game = normalizeBoxGame(
    finalGame,
    undefined,
    new Map([[249, 17]]),
    line?.spreadHome ?? null,
    NOW,
  );
  const { stats } = normalizeTeamGameStats(
    gameTeams,
    withOpponentRows(advanced),
  );
  return {
    game,
    attendance: null,
    away,
    home,
    fbs: { away: true, home: true },
    awayStats: stats.find((s) => s.teamId === 249) ?? null,
    homeStats: stats.find((s) => s.teamId === 202) ?? null,
    awayPlayers: normalizeBoxPlayers(players[0], "away", "North Texas"),
    homePlayers: normalizeBoxPlayers(players[0], "home", "Tulsa"),
    scoring: normalizeScoringPlays(drives, finalGame),
    line,
  };
}

function upcomingBox(): BoxScore {
  return {
    ...finalBox(),
    game: normalizeBoxGame(upcoming, undefined, new Map(), null, NOW),
    awayStats: null,
    homeStats: null,
    awayPlayers: [],
    homePlayers: [],
    scoring: [],
    line: null,
  };
}

afterEach(cleanup);

describe("GameHeader", () => {
  it("final: result, overtime, winner emphasis, rank and line score", () => {
    render(<GameHeader box={finalBox()} />);
    expect(
      screen.getByRole("heading", { name: "FINAL · OT" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("North Texas score")).toHaveTextContent("45");
    expect(screen.getByLabelText("North Texas score")).toHaveClass(
      "text-fg-winner",
    );
    expect(screen.getByLabelText("Tulsa score")).toHaveTextContent("44");
    expect(screen.getByLabelText("Tulsa score")).toHaveClass("text-fg-muted");
    expect(screen.getByLabelText("AP rank 17")).toHaveTextContent("17");
    expect(screen.getByRole("link", { name: "North Texas" })).toHaveAttribute(
      "href",
      "/teams/249-north-texas?season=2026",
    );
    const table = screen.getByRole("table", { name: "Line score" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["3", "7", "21", "7", "7", "45"]);
    expect(
      within(rows[0])
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["LINE SCORE", "1", "2", "3", "4", "OT", "T"]);
  });

  it("does not link an opponent outside FBS", () => {
    render(
      <GameHeader box={{ ...finalBox(), fbs: { away: false, home: true } }} />,
    );
    expect(screen.queryByRole("link", { name: "North Texas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Tulsa" })).toBeInTheDocument();
  });

  it("live: clock, dot and a partial line score with dashes", () => {
    const box = finalBox();
    box.game = {
      ...box.game,
      status: "live",
      period: 3,
      clock: "3:40",
      away: { ...box.game.away, points: 31, lineScores: [3, 7, 21] },
      home: { ...box.game.home, points: 24, lineScores: [0, 17, 7] },
    };
    render(<GameHeader box={box} />);
    expect(screen.getByRole("heading", { name: "LIVE" })).toBeInTheDocument();
    expect(screen.getByText("Q3 3:40")).toBeInTheDocument();
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["3", "7", "21", "—", "31"]);
  });

  it("live without a clock still says so", () => {
    const box = finalBox();
    box.game = { ...box.game, status: "live", period: null, clock: null };
    render(<GameHeader box={box} />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("live at halftime reads Halftime, not Q2 0:00", () => {
    const box = finalBox();
    box.game = { ...box.game, status: "live", period: 2, clock: "0:00" };
    render(<GameHeader box={box} />);
    expect(screen.getByText("Halftime")).toBeInTheDocument();
  });

  it("live: shows the down-and-distance situation under the clock", () => {
    const box = finalBox();
    box.game = {
      ...box.game,
      status: "live",
      period: 2,
      clock: "0:28",
      situation: "1st & Goal at JXST 5",
    };
    render(<GameHeader box={box} />);
    expect(screen.getByText("Q2 0:28")).toBeInTheDocument();
    expect(screen.getByText("1st & Goal at JXST 5")).toBeInTheDocument();
  });

  it("scheduled: kickoff time, dashes for scores, no line score", () => {
    render(<GameHeader box={upcomingBox()} />);
    expect(
      screen.getByRole("heading", { name: "SCHEDULED" }),
    ).toBeInTheDocument();
    expect(screen.getByText("7:00 PM ET")).toBeInTheDocument();
    expect(screen.getByLabelText("North Texas score")).toHaveTextContent("—");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("LineStrip", () => {
  it("shows the spread, result against it, total and moneylines", () => {
    render(<LineStrip box={finalBox()} />);
    const strip = screen.getByRole("region", { name: "Spread and result" });
    expect(within(strip).getByText("UNT -3")).toBeInTheDocument();
    expect(within(strip).getByText("Missed")).toBeInTheDocument();
    expect(within(strip).getByText("TLSA covered")).toBeInTheDocument();
    expect(within(strip).getByText("Over")).toBeInTheDocument();
    expect(within(strip).getByText("UNT -148 · TLSA +124")).toBeInTheDocument();
  });
  it("renders nothing with no line", () => {
    const { container } = render(<LineStrip box={upcomingBox()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TeamStatsPanel", () => {
  it("renders the comparison rows with plays in the headings", () => {
    render(<TeamStatsPanel box={finalBox()} />);
    expect(screen.getByText("North Texas · 86 plays")).toBeInTheDocument();
    expect(screen.getByText("Tulsa · 81 plays")).toBeInTheDocument();
    expect(screen.getByText("Total Yards")).toBeInTheDocument();
    expect(screen.getByText("559")).toBeInTheDocument();
    expect(screen.getByText("42.1% (8/19)")).toBeInTheDocument();
  });
  it("explains the empty state by game status", () => {
    render(<TeamStatsPanel box={upcomingBox()} />);
    expect(
      screen.getByText("Team stats appear once the game kicks off."),
    ).toBeInTheDocument();
    cleanup();
    const live = upcomingBox();
    live.game = { ...live.game, status: "live" };
    render(<TeamStatsPanel box={live} />);
    expect(
      screen.getByText("Team stats are not available during the game yet."),
    ).toBeInTheDocument();
    cleanup();
    const old = upcomingBox();
    old.game = { ...old.game, status: "final" };
    render(<TeamStatsPanel box={old} />);
    expect(
      screen.getByText("Team stats are not available for this game."),
    ).toBeInTheDocument();
  });
});

describe("ScoringSummary", () => {
  it("lists every scoring drive with period, drive detail and running score", () => {
    render(<ScoringSummary box={finalBox()} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(15); // header + 14
    const first = within(rows[1])
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(first[0]).toBe("Q1 3:06");
    expect(first[2]).toContain("Field goal");
    expect(first[2]).toContain("15 plays, 66 yds, 7:04");
    expect(first.slice(3)).toEqual(["3", "0"]);
    const last = within(rows[14])
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(last[0]).toBe("OT");
    expect(last.slice(3)).toEqual(["45", "44"]);
    expect(screen.getByText("14 scoring drives")).toBeInTheDocument();
  });
  it("drops the score columns when the drive scores do not reconcile", () => {
    const box = finalBox();
    box.scoring = normalizeScoringPlays(drives, {
      ...finalGame,
      homePoints: 41,
    });
    render(<ScoringSummary box={box} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });
  it("has empty messages for upcoming and live-without-scoring games", () => {
    render(<ScoringSummary box={upcomingBox()} />);
    expect(
      screen.getByText("Scoring appears once the game starts."),
    ).toBeInTheDocument();
    cleanup();
    const live = upcomingBox();
    live.game = { ...live.game, status: "live" };
    render(<ScoringSummary box={live} />);
    expect(
      screen.getByText(
        "The scoring summary is not available during the game yet.",
      ),
    ).toBeInTheDocument();
  });
});

describe("PlayerPanels", () => {
  it("shows each team's tables and links players (not the team-totals row)", () => {
    render(<PlayerPanels box={finalBox()} />);
    expect(screen.getByText("NORTH TEXAS · PLAYER STATS")).toBeInTheDocument();
    expect(screen.getByText("TULSA · PLAYER STATS")).toBeInTheDocument();
    // he passes and rushes, so he is in two tables
    const jackson = screen.getAllByRole("link", { name: "Tayven Jackson" })[0];
    expect(jackson).toHaveAttribute(
      "href",
      "/players/4801307-tayven-jackson?team=North+Texas&season=2026",
    );
    const teamRow = screen.getByText("Team");
    expect(teamRow.closest("a")).toBeNull();
    for (const label of ["PASSING", "RUSHING", "RECEIVING", "DEFENSE"]) {
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
    expect(screen.getAllByText("HUR")).toHaveLength(2);
  });
  it("says so when there are no player stats yet", () => {
    render(<PlayerPanels box={upcomingBox()} />);
    expect(screen.getAllByText("No player stats yet.")).toHaveLength(2);
    cleanup();
    const live = upcomingBox();
    live.game = { ...live.game, status: "live" };
    render(<PlayerPanels box={live} />);
    expect(
      screen.getAllByText(
        "Player stats are not available during the game yet.",
      ),
    ).toHaveLength(2);
  });
});

describe("links into the box score", () => {
  it("scoreboard panel: 'Full box score' with or without stats", () => {
    const box = finalBox();
    const { rerender } = render(
      <StatPanel
        id="p"
        game={box.game}
        away={away}
        home={home}
        stats={[box.awayStats!, box.homeStats!]}
      />,
    );
    const href = "/games/401862786-north-texas-at-tulsa";
    expect(
      screen.getByRole("link", { name: /Full box score/ }),
    ).toHaveAttribute("href", href);
    rerender(
      <StatPanel
        id="p"
        game={box.game}
        away={away}
        home={home}
        stats={undefined}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Full box score/ }),
    ).toHaveAttribute("href", href);
  });

  it("team schedule: results link to the game, away games read away-at-home", () => {
    const texas = team(251, "Texas", "TEX");
    const row = (o: Partial<ScheduleRow>): ScheduleRow => ({
      gameId: 1,
      week: 1,
      seasonType: "regular",
      startUtc: "2026-09-05T23:00:00.000Z",
      startTbd: false,
      opponent: { id: 2, name: "Ohio State" },
      site: "home",
      venue: "",
      conferenceGame: false,
      completed: true,
      pointsFor: 24,
      pointsAgainst: 23,
      result: "W",
      ...o,
    });
    const profile = {
      index: { teams: [], season: 2026 },
      team: texas,
      season: 2026,
      schedule: [
        row({}),
        row({ gameId: 2, site: "away", opponent: { id: 3, name: "UTSA" } }),
        row({
          gameId: 3,
          completed: false,
          result: null,
          pointsFor: null,
          pointsAgainst: null,
        }),
      ],
    } as unknown as TeamProfile;
    render(<SchedulePanel profile={profile} />);
    expect(screen.getAllByRole("link", { name: "W 24–23" })[0]).toHaveAttribute(
      "href",
      "/games/1-ohio-state-at-texas",
    );
    expect(screen.getAllByRole("link", { name: "W 24–23" })[1]).toHaveAttribute(
      "href",
      "/games/2-texas-at-utsa",
    );
    expect(screen.getByRole("link", { name: /ET$/ })).toHaveAttribute(
      "href",
      "/games/3-ohio-state-at-texas",
    );
  });
});
