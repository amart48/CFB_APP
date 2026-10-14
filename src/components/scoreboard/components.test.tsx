// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GameRow as GameRowModel,
  Team,
  TeamGameStats,
} from "@/lib/cfbd/models";
import { groupByDay } from "@/lib/scoreboard/games";
import { parseFilters } from "@/lib/scoreboard/params";
import { FilterBar } from "./FilterBar";
import { FilterSummary } from "./FilterSummary";
import { GameList } from "./GameList";
import { StateMessage } from "./StateMessage";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/image", () => ({
  default: (p: { alt: string }) => (
    <span role="img" aria-label={p.alt || "logo"} />
  ),
}));

const team = (id: number, school: string, abbreviation: string): Team => ({
  id,
  school,
  mascot: "",
  abbreviation,
  conference: "SEC",
  color: "#9e2638",
  altColor: "#ffffff",
  alternateNames: [],
});
const teams = {
  1: team(1, "Alabama", "BAMA"),
  2: team(2, "Tennessee", "TENN"),
};

const side = (
  teamId: number,
  points: number | null,
  apRank: number | null = null,
) => ({
  teamId,
  points,
  apRank,
  lineScores: null,
});
const base: GameRowModel = {
  id: 10,
  startUtc: "2026-10-10T23:30:00Z",
  startTbd: false,
  status: "final",
  period: null,
  clock: null,
  away: side(1, 31, 7),
  home: side(2, 24, 14),
  tv: "ABC",
  spreadHome: 3.5,
  overUnder: null,
  neutralSite: false,
  venue: "",
  conferenceGame: true,
};
const stat = (
  teamId: number,
  o: Partial<TeamGameStats> = {},
): TeamGameStats => ({
  gameId: 10,
  teamId,
  totalYards: 458,
  rushYards: 172,
  passYards: 286,
  turnovers: 1,
  thirdDown: { made: 6, att: 13 },
  possessionSeconds: 1938,
  plays: 68,
  yardsPerPlay: 6.7,
  successRate: 0.5,
  ppa: null,
  explosiveness: null,
  ...o,
});

beforeEach(() => {
  replace.mockClear();
});
afterEach(cleanup);

describe("GameList", () => {
  const renderList = (
    game: GameRowModel,
    stats: Record<number, TeamGameStats[]> = {},
  ) =>
    render(
      <GameList
        viewKey="test"
        revealItems={{}}
        groups={groupByDay([game])}
        teams={teams}
        stats={stats}
      />,
    );

  it("renders status, ranks, scores, spread result and network for a final", () => {
    renderList(base);
    expect(screen.getByText("Saturday, Oct 10")).toBeInTheDocument();
    expect(screen.getByText("1 game")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("Alabama")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument(); // AP rank, no "#"
    expect(screen.getByText("31")).toBeInTheDocument();
    // home Tennessee +3.5 means Alabama (away) is favored by 3.5 and won by 7: covered
    expect(screen.getByText("BAMA -3.5 · Covered")).toBeInTheDocument();
    expect(screen.getByText("ABC")).toBeInTheDocument();
  });

  it("adds the total line, with the result once the game is final", () => {
    renderList({ ...base, overUnder: 56.5 }); // 31 + 24 = 55 points
    expect(
      screen.getByText("BAMA -3.5 · Covered · O/U 56.5 Under"),
    ).toBeInTheDocument();
  });

  it("shows only the line before kickoff, and the total alone when there is no spread", () => {
    renderList({
      ...base,
      status: "scheduled",
      away: side(1, null),
      home: side(2, null),
      overUnder: 49,
    });
    expect(screen.getByText("BAMA -3.5 · O/U 49")).toBeInTheDocument();
  });

  it("shows kickoff time, dashes for scores and an em dash for a missing network", () => {
    renderList({
      ...base,
      status: "scheduled",
      tv: null,
      away: side(1, null),
      home: side(2, null),
    });
    expect(screen.getByText("7:30 PM ET")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3); // two scores + network
  });

  it("shows the live clock", () => {
    renderList({ ...base, status: "live", period: 3, clock: "4:12" });
    expect(screen.getByText("Q3 4:12")).toBeInTheDocument();
  });

  it("marks neutral-site games", () => {
    renderList({ ...base, neutralSite: true });
    expect(screen.getByTitle("Neutral site")).toBeInTheDocument();
  });

  it("expands and collapses the stat panel, one game at a time", async () => {
    const user = userEvent.setup();
    const other: GameRowModel = {
      ...base,
      id: 11,
      startUtc: "2026-10-10T20:00:00Z",
    };
    render(
      <GameList
        viewKey="test"
        revealItems={{}}
        groups={groupByDay([base, other])}
        teams={teams}
        stats={{
          10: [
            stat(1),
            stat(2, {
              totalYards: 373,
              turnovers: 2,
              thirdDown: { made: 5, att: 14 },
            }),
          ],
        }}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /show team stats/i });
    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");

    // groupByDay sorts by kickoff, so game 11 (20:00Z) is first and game 10 second
    await user.click(buttons[1]);
    const panel = document.getElementById("stats-10")!;
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByText("Alabama · 68 plays")).toBeInTheDocument();
    expect(within(panel).getByText("TEAM STATS · FINAL")).toBeInTheDocument();
    expect(within(panel).getByText("46.2% (6/13)")).toBeInTheDocument();
    expect(within(panel).getByText("35.7% (5/14)")).toBeInTheDocument();
    expect(within(panel).getByText("Time of Possession")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /hide team stats/i }),
    ).toHaveAttribute("aria-expanded", "true");

    // opening another game closes the first
    await user.click(
      screen.getAllByRole("button", { name: /show team stats/i })[0],
    );
    expect(document.getElementById("stats-10")).toBeNull();
    expect(document.getElementById("stats-11")).toBeInTheDocument();

    // clicking the open one again collapses it
    await user.click(screen.getByRole("button", { name: /hide team stats/i }));
    expect(document.getElementById("stats-11")).toBeNull();
  });

  it("toggles when the row itself is clicked", async () => {
    const user = userEvent.setup();
    renderList(base, { 10: [stat(1), stat(2)] });
    await user.click(screen.getByText("Alabama"));
    expect(document.getElementById("stats-10")).toBeInTheDocument();
  });

  it("explains when stats are not available", async () => {
    const user = userEvent.setup();
    renderList({ ...base, status: "scheduled" });
    await user.click(screen.getByRole("button", { name: /show team stats/i }));
    expect(
      screen.getByText("Team stats appear once the game kicks off."),
    ).toBeInTheDocument();
  });

  it("does not crash on a game whose team is unknown", () => {
    render(
      <GameList
        viewKey="test"
        revealItems={{}}
        groups={groupByDay([{ ...base, away: side(999, 1) }])}
        teams={teams}
        stats={{}}
      />,
    );
    expect(screen.queryByText("Alabama")).toBeNull();
  });
});

describe("FilterSummary", () => {
  it("shows only the count with no filters", () => {
    render(<FilterSummary count={12} filters={parseFilters({})} />);
    expect(screen.getByText("12 games")).toBeInTheDocument();
    expect(screen.queryByText("Clear filters")).toBeNull();
  });
  it("shows singular count, chips with removal links, and clear link", () => {
    render(
      <FilterSummary
        count={1}
        filters={parseFilters({ conf: "SEC", top25: "1", q: "tex", week: "6" })}
      />,
    );
    expect(screen.getByText("1 game")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Remove filter SEC" }),
    ).toHaveAttribute("href", "/?week=6&top25=1&q=tex");
    expect(
      screen.getByRole("link", { name: "Remove filter Top 25 only" }),
    ).toHaveAttribute("href", "/?week=6&conf=SEC&q=tex");
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/?week=6",
    );
  });
});

describe("StateMessage", () => {
  it("renders the empty state with a clear action", () => {
    render(
      <StateMessage
        variant="empty"
        title="No games match these filters"
        message="Try another team."
        action={{ href: "/", label: "Clear filters" }}
      />,
    );
    expect(
      screen.getByText("No games match these filters"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/",
    );
  });
  it("announces errors", () => {
    render(
      <StateMessage
        variant="error"
        title="Couldn't load games"
        message="Rate limited."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Rate limited.");
  });
});

describe("FilterBar", () => {
  const props = {
    season: 2026,
    currentSeason: 2026,
    seasons: [2026, 2025],
    weeks: [
      { value: "5", label: "Week 5" },
      { value: "6", label: "Week 6" },
      { value: "7", label: "Week 7" },
    ],
    selectedWeek: "6",
    conferences: ["ACC", "SEC"],
  };
  const lastUrl = () => replace.mock.calls.at(-1)?.[0] as string;

  it("steps weeks and disables the arrows at the ends", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FilterBar {...props} filters={parseFilters({})} />,
    );
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(lastUrl()).toBe("/?week=7");
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(lastUrl()).toBe("/?week=5");

    rerender(
      <FilterBar {...props} selectedWeek="5" filters={parseFilters({})} />,
    );
    expect(
      screen.getByRole("button", { name: "Previous week" }),
    ).toBeDisabled();
    rerender(
      <FilterBar {...props} selectedWeek="7" filters={parseFilters({})} />,
    );
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
  });

  it("toggles Top 25 and keeps other filters", async () => {
    const user = userEvent.setup();
    render(<FilterBar {...props} filters={parseFilters({ conf: "SEC" })} />);
    const toggle = screen.getByRole("switch", { name: "Top 25 only" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(lastUrl()).toBe("/?conf=SEC&top25=1");
  });

  it("changes conference, and 'All' removes the param", async () => {
    render(<FilterBar {...props} filters={parseFilters({ conf: "SEC" })} />);
    fireEvent.change(screen.getByLabelText("Conference"), {
      target: { value: "ACC" },
    });
    expect(lastUrl()).toBe("/?conf=ACC");
    fireEvent.change(screen.getByLabelText("Conference"), {
      target: { value: "All" },
    });
    expect(lastUrl()).toBe("/");
  });

  it("changing season resets the week, and the current season is the default (no param)", () => {
    render(<FilterBar {...props} filters={parseFilters({ week: "6" })} />);
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "2025" },
    });
    expect(lastUrl()).toBe("/?season=2025");
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "2026" },
    });
    expect(lastUrl()).toBe("/");
  });

  describe("search", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("debounces typing into one URL update", () => {
      render(<FilterBar {...props} filters={parseFilters({})} />);
      const input = screen.getByLabelText("Search a team");
      fireEvent.change(input, { target: { value: "t" } });
      fireEvent.change(input, { target: { value: "te" } });
      fireEvent.change(input, { target: { value: "tex" } });
      expect(replace).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(300));
      expect(replace).toHaveBeenCalledTimes(1);
      expect(lastUrl()).toBe("/?q=tex");
    });

    it("clears with the x button", () => {
      render(<FilterBar {...props} filters={parseFilters({ q: "tex" })} />);
      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
      act(() => vi.advanceTimersByTime(300));
      expect(lastUrl()).toBe("/");
      expect(screen.getByLabelText("Search a team")).toHaveValue("");
    });

    it("follows the URL when the filter is removed elsewhere (chip), without clobbering typing", () => {
      const { rerender } = render(
        <FilterBar {...props} filters={parseFilters({ q: "tex" })} />,
      );
      expect(screen.getByLabelText("Search a team")).toHaveValue("tex");
      // chip removal: URL loses q, we did not push it
      rerender(<FilterBar {...props} filters={parseFilters({})} />);
      expect(screen.getByLabelText("Search a team")).toHaveValue("");

      // user types "ab"; URL catches up to "a" only after they already typed "b"
      const input = screen.getByLabelText("Search a team");
      fireEvent.change(input, { target: { value: "a" } });
      act(() => vi.advanceTimersByTime(300));
      fireEvent.change(input, { target: { value: "ab" } });
      rerender(<FilterBar {...props} filters={parseFilters({ q: "a" })} />);
      expect(screen.getByLabelText("Search a team")).toHaveValue("ab");
    });
  });
});
