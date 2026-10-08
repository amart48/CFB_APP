// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerProfile } from "@/lib/cfbd/loaders";
import type { PlayerGameLog, SituationSplits, Team } from "@/lib/cfbd/models";
import { CATEGORY_BY_ID } from "@/lib/players/categories";
import { CareerPanel } from "./CareerPanel";
import { GameLogPanel } from "./GameLogPanel";
import { PlayerHeader } from "./PlayerHeader";
import { RankRow, SeasonStatsPanel } from "./SeasonStatsPanel";
import { UsagePpaPanel } from "./UsagePpaPanel";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/players/4870906-arch-manning",
}));
vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));
const loadCareer = vi.fn();
const loadPlayerRows = vi.fn();
vi.mock("@/lib/cfbd/loaders", () => ({
  loadCareer: (...a: unknown[]) => loadCareer(...a),
  loadPlayerRows: (...a: unknown[]) => loadPlayerRows(...a),
}));

const texas: Team = {
  id: 251,
  school: "Texas",
  mascot: "Longhorns",
  abbreviation: "TEX",
  conference: "SEC",
  color: "#bf5700",
  altColor: "#fff",
  alternateNames: [],
};
const splits = (o: Partial<SituationSplits> = {}): SituationSplits => ({
  all: 0.195,
  pass: 0.208,
  rush: 0.311,
  firstDown: -0.104,
  secondDown: 0.357,
  thirdDown: 0.543,
  standardDowns: 0.02,
  passingDowns: 0.4,
  ...o,
});
const profile = (o: Partial<PlayerProfile> = {}): PlayerProfile => ({
  season: 2025,
  currentSeason: 2026,
  seasons: [2023, 2024, 2025],
  stints: [{ team: "Texas", startYear: 2023, endYear: 2026 }],
  bio: {
    id: "4870906",
    name: "Arch Manning",
    position: "QB",
    jersey: 16,
    classYear: "Junior",
    heightInches: 76,
    weightLbs: 222,
    hometown: "New Orleans, LA",
  },
  team: texas,
  teamName: "Texas",
  categories: [
    {
      category: "passing",
      stats: {
        COMPLETIONS: 248,
        ATT: 404,
        PCT: 0.614,
        YDS: 3163,
        YPA: 7.8,
        TD: 26,
        INT: 7,
      },
    },
    {
      category: "rushing",
      stats: { CAR: 31, YDS: 79, YPC: 2.5, TD: 0, LONG: 20 },
    },
  ],
  primary: "passing",
  usage: splits({ all: 0.505, pass: 0.94, rush: 0.137 }),
  ppa: splits(),
  games: [],
  ...o,
});

beforeEach(() => {
  replace.mockClear();
  loadCareer.mockReset();
  loadPlayerRows.mockReset();
});
afterEach(cleanup);

describe("PlayerHeader", () => {
  it("shows identity, bio strip and the season picker (newest first)", () => {
    render(<PlayerHeader profile={profile()} />);
    expect(
      screen.getByRole("heading", { name: "Arch Manning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("#16 · QB · Texas · Junior")).toBeInTheDocument();
    expect(screen.getByText(`6'4"`)).toBeInTheDocument();
    expect(screen.getByText("222 lb")).toBeInTheDocument();
    expect(screen.getByText("New Orleans, LA")).toBeInTheDocument();
    const options = within(screen.getByLabelText("Season"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["2025", "2024", "2023"]);
  });

  it("uses em dashes for missing bio fields and drops the logo when the team is unknown", () => {
    render(
      <PlayerHeader
        profile={profile({
          team: null,
          bio: {
            ...profile().bio,
            jersey: null,
            classYear: null,
            heightInches: null,
            weightLbs: null,
            hometown: null,
          },
        })}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.getByText("QB · Texas")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("UsagePpaPanel", () => {
  it("formats usage as percents with bars, and PPA to two decimals (negatives included)", () => {
    const { container } = render(
      <UsagePpaPanel
        usage={profile().usage}
        ppa={profile().ppa}
        color="#bf5700"
      />,
    );
    expect(screen.getByText("50.5%")).toBeInTheDocument();
    expect(screen.getByText("94.0%")).toBeInTheDocument();
    expect(screen.getByText("-0.10")).toBeInTheDocument();
    expect(screen.getByText("0.54")).toBeInTheDocument();
    const widths = [
      ...container.querySelectorAll<HTMLElement>("[style*='width']"),
    ].map((e) => e.style.width);
    expect(widths).toContain("94%");
  });

  it("explains when a split is missing", () => {
    render(
      <UsagePpaPanel usage={null} ppa={splits({ all: null })} color="#fff" />,
    );
    expect(
      screen.getByText("Not enough plays this season."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("GameLogPanel", () => {
  const games: PlayerGameLog[] = [
    {
      week: 1,
      opponent: "Texas State",
      ppaAll: 0.808,
      ppaPass: 0.9,
      ppaRush: 0.5,
    },
    { week: 3, opponent: "UTSA", ppaAll: -0.128, ppaPass: -0.2, ppaRush: null },
  ];

  it("renders a row per game with signed PPA and diverging bars (negative dimmed)", () => {
    const { container } = render(
      <GameLogPanel games={games} season={2026} color="#bf5700" />,
    );
    const rows = within(container.querySelector("tbody")!).getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Texas State");
    expect(rows[0]).toHaveTextContent("0.81");
    expect(rows[1]).toHaveTextContent("-0.13");
    expect(rows[1]).toHaveTextContent("—");
    const bars = [
      ...container.querySelectorAll<HTMLElement>(
        "span[style*='background-color']",
      ),
    ];
    expect(bars[0].style.opacity).toBe("1");
    expect(bars[1].style.opacity).toBe("0.45");
    expect(bars[0].style.width).toBe("50%"); // clamped: 0.808 exceeds the +/-0.5 scale
  });

  it("shows a message with no games", () => {
    render(<GameLogPanel games={[]} season={2026} color="#fff" />);
    expect(
      screen.getByText("No games with enough plays yet."),
    ).toBeInTheDocument();
  });
});

describe("SeasonStatsPanel", () => {
  it("renders a block per category with formatted values and no rank row for past seasons", () => {
    render(<SeasonStatsPanel profile={profile()} />);
    expect(screen.getByText("PASSING")).toBeInTheDocument();
    expect(screen.getByText("RUSHING")).toBeInTheDocument();
    expect(screen.getByText("3,163")).toBeInTheDocument();
    expect(screen.getByText("61.4%")).toBeInTheDocument();
    expect(screen.getByText("2.5")).toBeInTheDocument();
    expect(screen.queryByText("Rank")).toBeNull();
    expect(loadPlayerRows).not.toHaveBeenCalled();
  });

  it("says so when there are no stats", () => {
    render(
      <SeasonStatsPanel profile={profile({ categories: [], primary: null })} />,
    );
    expect(screen.getByText("No recorded stats for 2025.")).toBeInTheDocument();
  });
});

describe("RankRow", () => {
  const passing = CATEGORY_BY_ID.get("passing")!;
  const row = (id: string, yds: number) => ({
    playerId: id,
    name: id,
    position: "QB",
    team: texas,
    stats: {
      YDS: yds,
      ATT: 100,
      COMPLETIONS: 50,
      PCT: 0.5,
      YPA: 7,
      TD: 5,
      INT: 1,
    },
    qualified: true,
  });

  it("shows ranks among qualified players, with a tooltip", async () => {
    loadPlayerRows.mockResolvedValue([
      row("a", 900),
      row("b", 800),
      row("4870906", 700),
    ]);
    render(
      await RankRow({ category: passing, profile: profile({ season: 2026 }) }),
    );
    expect(screen.getByText("Rank")).toBeInTheDocument();
    const third = screen.getAllByText("#3")[0];
    expect(third).toHaveAttribute("title", "3 of 3 qualified players");
  });

  it("shows dashes when the leaderboard fails", async () => {
    loadPlayerRows.mockRejectedValue(new Error("down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      await RankRow({ category: passing, profile: profile({ season: 2026 }) }),
    );
    expect(screen.getAllByText("—")).toHaveLength(passing.columns.length);
    spy.mockRestore();
  });
});

describe("CareerPanel", () => {
  it("lists seasons newest first, marks the selected one, and links to each season", async () => {
    loadCareer.mockResolvedValue([
      { season: 2023, team: "Texas", stats: { YDS: 30, ATT: 5 } },
      { season: 2024, team: "Texas", stats: { YDS: 938, ATT: 90 } },
      { season: 2025, team: "Texas", stats: null },
    ]);
    render(await CareerPanel({ profile: profile() }));
    const links = screen.getAllByRole("link").map((l) => l.textContent);
    expect(links).toEqual(["2025", "2024", "2023"]);
    expect(screen.getByRole("link", { name: "2025" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "2024" })).toHaveAttribute(
      "href",
      "?season=2024",
    );
    expect(screen.getByText("938")).toBeInTheDocument();
    expect(screen.getByText("CAREER · PASSING")).toBeInTheDocument();
  });

  it("renders nothing for a one-season player or one with no primary category", async () => {
    expect(
      await CareerPanel({ profile: profile({ seasons: [2025] }) }),
    ).toBeNull();
    expect(
      await CareerPanel({ profile: profile({ primary: null }) }),
    ).toBeNull();
  });

  it("shows an error message instead of crashing", async () => {
    loadCareer.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(await CareerPanel({ profile: profile() }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    spy.mockRestore();
  });
});
