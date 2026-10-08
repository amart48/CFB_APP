// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import type { ScheduleRow, Team, TeamSeasonRow } from "@/lib/cfbd/models";
import { LeadersPanel } from "./LeadersPanel";
import { PpaChartPanel } from "./PpaChartPanel";
import { RankingsPanel } from "./RankingsPanel";
import { RosterPanel } from "./RosterPanel";
import { SchedulePanel } from "./SchedulePanel";
import { ApRank, SpRating, SummaryStrip } from "./SummaryStrip";
import { BackLink, TeamHeader } from "./TeamHeader";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/teams/251-texas",
}));
vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));
const chart = vi.fn();
vi.mock("./PpaChart", () => ({
  PpaChart: (props: unknown) => {
    chart(props);
    return <div data-testid="chart" />;
  },
}));
const loadTeamRows = vi.fn();
const loadApRank = vi.fn();
vi.mock("@/lib/cfbd/loaders", () => ({
  loadTeamRows: (...a: unknown[]) => loadTeamRows(...a),
  loadApRank: (...a: unknown[]) => loadApRank(...a),
}));

const team = (id: number, school: string, o: Partial<Team> = {}): Team => ({
  id,
  school,
  mascot: "",
  abbreviation: school.slice(0, 4).toUpperCase(),
  conference: "SEC",
  color: "#bf5700",
  altColor: "#ffffff",
  alternateNames: [],
  ...o,
});
const texas = team(251, "Texas", {
  mascot: "Longhorns",
  abbreviation: "TEX",
  venue: {
    name: "DKR-Texas Memorial Stadium",
    city: "Austin",
    state: "TX",
    capacity: 100119,
  },
});
const tennessee = team(2633, "Tennessee", { abbreviation: "TENN" });

const game = (o: Partial<ScheduleRow>): ScheduleRow => ({
  gameId: 1,
  week: 1,
  seasonType: "regular",
  startUtc: "2026-09-05T19:30:00.000Z",
  startTbd: false,
  opponent: { id: 326, name: "Texas State" },
  site: "home",
  venue: "DKR-Texas Memorial Stadium",
  conferenceGame: false,
  completed: true,
  pointsFor: 59,
  pointsAgainst: 7,
  result: "W",
  ...o,
});

const profile = (o: Partial<TeamProfile> = {}): TeamProfile => ({
  index: {
    season: 2026,
    currentSeason: 2026,
    isPast: false,
    teams: [texas, tennessee],
    conferences: ["SEC"],
  },
  team: texas,
  season: 2026,
  record: {
    overall: { wins: 4, losses: 0, ties: 0 },
    conference: { wins: 1, losses: 0, ties: 0 },
    home: { wins: 3, losses: 0, ties: 0 },
    away: { wins: 1, losses: 0, ties: 0 },
    expectedWins: 2.83,
  },
  coach: "Steve Sarkisian",
  schedule: [],
  ppaGames: [],
  roster: [],
  leaders: [],
  ...o,
});

beforeEach(() => {
  chart.mockClear();
  loadTeamRows.mockReset();
  loadApRank.mockReset();
});
afterEach(cleanup);

describe("TeamHeader", () => {
  it("shows name, mascot, conference, coach and stadium, and a season picker newest first", () => {
    render(<TeamHeader profile={profile()} />);
    expect(screen.getByRole("heading", { name: "Texas" })).toBeInTheDocument();
    expect(screen.getByText("Longhorns")).toBeInTheDocument();
    expect(
      screen.getByText(
        "SEC · Head coach Steve Sarkisian · DKR-Texas Memorial Stadium, Austin, TX",
      ),
    ).toBeInTheDocument();
    const options = within(screen.getByLabelText("Season"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options[0]).toBe("2026");
    expect(options.at(-1)).toBe("2015");
  });

  it("omits coach and stadium when unknown", () => {
    render(
      <TeamHeader
        profile={profile({ coach: null, team: team(251, "Texas") })}
      />,
    );
    expect(screen.getByText("SEC")).toBeInTheDocument();
  });

  it("links back to the team table", () => {
    render(<BackLink />);
    expect(screen.getByRole("link", { name: "Team Stats" })).toHaveAttribute(
      "href",
      "/teams",
    );
  });
});

describe("SummaryStrip", () => {
  it("shows record splits and expected wins; AP rank and SP+ are placeholders until they stream", () => {
    const { container } = render(<SummaryStrip profile={profile()} />);
    expect(screen.getByText("4-0")).toBeInTheDocument();
    expect(screen.getByText("3-0")).toBeInTheDocument();
    expect(screen.getByText("2.8")).toBeInTheDocument();
    expect(
      container.querySelectorAll("[aria-hidden]").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("uses dashes when there is no record", () => {
    render(
      <SummaryStrip
        profile={profile({
          record: {
            overall: null,
            conference: null,
            home: null,
            away: null,
            expectedWins: null,
          },
        })}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(5);
  });

  it("ApRank shows the rank, or a dash when unranked or on failure", async () => {
    loadApRank.mockResolvedValue(1);
    render(await ApRank({ profile: profile() }));
    expect(screen.getByText("1")).toBeInTheDocument();
    cleanup();
    loadApRank.mockResolvedValue(null);
    render(await ApRank({ profile: profile() }));
    expect(screen.getByText("—")).toBeInTheDocument();
    cleanup();
    loadApRank.mockImplementation(async () => {
      throw new Error("down");
    });
    const original = console.error;
    console.error = vi.fn();
    try {
      render(await ApRank({ profile: profile() }));
    } finally {
      console.error = original;
    }
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("SpRating shows the rating with its national rank", async () => {
    const row = (id: number, sp: number): TeamSeasonRow => ({
      team: team(id, "T" + id),
      record: null,
      spOverall: sp,
      spOffense: sp,
      spDefense: sp,
      off: {
        ppa: 0,
        successRate: 0,
        explosiveness: 0,
        yardsPerPlay: 0,
        pointsPerGame: 0,
      },
      def: {
        ppa: 0,
        successRate: 0,
        explosiveness: 0,
        yardsPerPlay: 0,
        pointsPerGame: 0,
      },
    });
    loadTeamRows.mockResolvedValue([row(251, 22.4), row(2, 30.1), row(3, 10)]);
    render(await SpRating({ profile: profile() }));
    expect(screen.getByText("22.4 · #2")).toBeInTheDocument();
  });
});

describe("RankingsPanel", () => {
  const row = (id: number, sp: number, defPpa: number): TeamSeasonRow => ({
    team: team(id, "T" + id),
    record: null,
    spOverall: sp,
    spOffense: sp,
    spDefense: sp,
    off: {
      ppa: 0.4,
      successRate: 0.52,
      explosiveness: 1.28,
      yardsPerPlay: 6.9,
      pointsPerGame: 38.4,
    },
    def: {
      ppa: defPpa,
      successRate: 0.38,
      explosiveness: 1.05,
      yardsPerPlay: 4.8,
      pointsPerGame: 14.2,
    },
  });

  it("shows value and national rank for every metric, grouped", async () => {
    loadTeamRows.mockResolvedValue([
      row(251, 22.4, 0.08),
      row(2, 30, -0.1),
      row(3, 10, 0.3),
    ]);
    render(await RankingsPanel({ profile: profile() }));
    expect(screen.getByText("Among 3 FBS teams")).toBeInTheDocument();
    expect(screen.getByText("SP+ RATINGS")).toBeInTheDocument();
    expect(screen.getByText("OFFENSE")).toBeInTheDocument();
    expect(screen.getByText("DEFENSE")).toBeInTheDocument();
    expect(screen.getAllByText("22.4")).toHaveLength(3); // SP+ overall, offense and defense
    expect(screen.getByText("52.0%")).toBeInTheDocument();
    // defense PPA is lower-is-better: 0.08 sits between -0.1 and 0.3, so #2
    const rows = screen.getAllByText("Overall")[0].parentElement!;
    expect(rows).toHaveTextContent("#2");
  });

  it("explains when the team has no ratings or the data fails", async () => {
    loadTeamRows.mockResolvedValue([row(2, 30, 0)]);
    render(await RankingsPanel({ profile: profile() }));
    expect(
      screen.getByText("No ratings for this team yet."),
    ).toBeInTheDocument();
    cleanup();
    loadTeamRows.mockImplementation(async () => {
      throw new Error("down");
    });
    const original = console.error;
    console.error = vi.fn();
    try {
      render(await RankingsPanel({ profile: profile() }));
    } finally {
      console.error = original;
    }
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("PpaChartPanel", () => {
  it("maps games to chart points with abbreviations, falling back for non-FBS opponents", () => {
    render(
      <PpaChartPanel
        profile={profile({
          ppaGames: [
            { week: 1, opponent: "Tennessee", offense: 0.46, defense: -0.01 },
            { week: 2, opponent: "Sam Houston", offense: null, defense: 0.1 },
          ],
        })}
      />,
    );
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    const props = chart.mock.calls[0][0] as {
      data: { label: string; offense: number | null }[];
      offenseColor: string;
    };
    expect(props.data.map((d) => d.label)).toEqual(["1 · TENN", "2 · SAM "]);
    expect(props.data[1].offense).toBeNull();
    expect(props.offenseColor).toMatch(/^#/);
  });

  it("shows a message with no games", () => {
    render(<PpaChartPanel profile={profile()} />);
    expect(screen.getByText("No games played yet.")).toBeInTheDocument();
    expect(chart).not.toHaveBeenCalled();
  });
});

describe("SchedulePanel", () => {
  const games = [
    game({ gameId: 1, week: 1 }),
    game({
      gameId: 2,
      week: 4,
      opponent: { id: 2633, name: "Tennessee" },
      site: "away",
      conferenceGame: true,
      pointsFor: 17,
      pointsAgainst: 20,
      result: "L",
      venue: "Neyland Stadium",
    }),
    game({
      gameId: 3,
      week: 6,
      opponent: { id: 201, name: "Oklahoma" },
      site: "neutral",
      completed: false,
      pointsFor: null,
      pointsAgainst: null,
      result: null,
      startUtc: "2026-10-10T19:30:00.000Z",
      conferenceGame: true,
    }),
    game({
      gameId: 4,
      week: 8,
      completed: false,
      startTbd: true,
      result: null,
      pointsFor: null,
      pointsAgainst: null,
      opponent: { id: 9999, name: "Sam Houston" },
    }),
    game({
      gameId: 5,
      week: 16,
      seasonType: "postseason",
      opponent: { id: 8, name: "Bowl Foe" },
      completed: false,
      result: null,
      pointsFor: null,
      pointsAgainst: null,
    }),
  ];

  it("renders date (Eastern), site prefix, result, venue and type for each game", () => {
    render(<SchedulePanel profile={profile({ schedule: games })} />);
    expect(screen.getByText("2026 · 5 games")).toBeInTheDocument();
    const rows = within(document.querySelector("tbody")!).getAllByRole("row");
    expect(rows[0]).toHaveTextContent("Sat, Sep 5");
    expect(rows[0]).toHaveTextContent("vs");
    expect(rows[0]).toHaveTextContent("W 59–7");
    expect(rows[0]).toHaveTextContent("Non-conference");
    expect(rows[1]).toHaveTextContent("@");
    expect(rows[1]).toHaveTextContent("L 17–20");
    expect(rows[1]).toHaveTextContent("Conference");
    expect(rows[2]).toHaveTextContent("N");
    expect(rows[2]).toHaveTextContent("3:30 PM ET");
    expect(rows[3]).toHaveTextContent("TBD");
    expect(rows[4]).toHaveTextContent("Postseason");
  });

  it("links FBS opponents to their team page (with season) and leaves others as plain text", () => {
    render(
      <SchedulePanel profile={profile({ schedule: games, season: 2025 })} />,
    );
    expect(screen.getByRole("link", { name: "Tennessee" })).toHaveAttribute(
      "href",
      "/teams/2633-tennessee?season=2025",
    );
    expect(screen.queryByRole("link", { name: "Sam Houston" })).toBeNull();
    expect(screen.getByText("Sam Houston")).toBeInTheDocument();
  });

  it("shows a message with no games", () => {
    render(<SchedulePanel profile={profile()} />);
    expect(screen.getByText("No games scheduled.")).toBeInTheDocument();
  });
});

describe("LeadersPanel", () => {
  it("links each leader to their player page and formats values", () => {
    render(
      <LeadersPanel
        profile={profile({
          leaders: [
            {
              key: "passing",
              label: "PASSING",
              playerId: "4870906",
              name: "Arch Manning",
              position: "QB",
              value: 2865,
              unit: "yds",
              detail: "7 TD · 3 INT",
            },
            {
              key: "sacks",
              label: "SACKS",
              playerId: "55",
              name: "Ed Edge",
              position: "EDGE",
              value: 4.5,
              unit: "sacks",
              detail: "9 HUR",
            },
          ],
        })}
      />,
    );
    expect(screen.getByText("2,865")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Arch Manning · QB" }),
    ).toHaveAttribute(
      "href",
      "/players/4870906-arch-manning?team=Texas&season=2026",
    );
    expect(screen.getByText("7 TD · 3 INT")).toBeInTheDocument();
  });

  it("shows a message with no leaders", () => {
    render(<LeadersPanel profile={profile()} />);
    expect(screen.getByText("No player stats yet.")).toBeInTheDocument();
  });
});

describe("RosterPanel", () => {
  const player = (
    id: string,
    name: string,
    group: "QB" | "DL" | "ST",
    position: string,
    o = {},
  ) => ({
    id,
    name,
    jersey: 7,
    position,
    group,
    classYear: "Junior",
    heightInches: 76,
    weightLbs: 222,
    hometown: "New Orleans, LA",
    ...o,
  });
  const roster = [
    player("1", "Arch Manning", "QB", "QB"),
    player("2", "Ed Edge", "DL", "EDGE", {
      jersey: null,
      hometown: null,
      classYear: null,
      heightInches: null,
      weightLbs: null,
    }),
    player("3", "Kay Kicker", "ST", "PK"),
  ];

  it("lists every player with bio fields and em dashes for missing ones", () => {
    render(<RosterPanel profile={profile({ roster })} filter="all" query="" />);
    expect(screen.getByText("3 players")).toBeInTheDocument();
    expect(screen.getAllByText(`6'4"`, { selector: "td" })).toHaveLength(2);
    const edge = screen.getByText("Ed Edge").closest("tr")!;
    expect(within(edge).getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("links players to their page for the season", () => {
    render(
      <RosterPanel
        profile={profile({ roster, season: 2025 })}
        filter="all"
        query=""
      />,
    );
    expect(screen.getByRole("link", { name: "Arch Manning" })).toHaveAttribute(
      "href",
      "/players/1-arch-manning?team=Texas&season=2025",
    );
  });

  it("filters by side of the ball and marks the active chip", () => {
    render(
      <RosterPanel profile={profile({ roster })} filter="defense" query="" />,
    );
    expect(screen.getByText("1 player")).toBeInTheDocument();
    expect(screen.queryByText("Arch Manning")).toBeNull();
    expect(screen.getByRole("link", { name: "Defense" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("builds chip links that keep the season and clear the group for All", () => {
    render(
      <RosterPanel
        profile={profile({ roster })}
        filter="offense"
        query="season=2025&group=offense"
      />,
    );
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "href",
      "?season=2025",
    );
    expect(screen.getByRole("link", { name: "Defense" })).toHaveAttribute(
      "href",
      "?season=2025&group=defense",
    );
    expect(screen.getByRole("link", { name: "Special teams" })).toHaveAttribute(
      "href",
      "?season=2025&group=special",
    );
  });

  it("handles an empty roster", () => {
    render(<RosterPanel profile={profile()} filter="all" query="" />);
    expect(screen.getByText("0 players")).toBeInTheDocument();
  });
});
