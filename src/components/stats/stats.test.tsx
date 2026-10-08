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
import type { Team, TeamSeasonRow } from "@/lib/cfbd/models";
import { DEFAULT_SORT } from "@/lib/teams/sort";
import { TeamsFilterBar } from "./TeamsFilterBar";
import { TeamsSkeleton } from "./TeamsSkeleton";
import { TeamsView } from "./TeamsView";

const replace = vi.fn();
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));

const side = (o: Partial<TeamSeasonRow["off"]> = {}) => ({
  ppa: 0.3,
  successRate: 0.5,
  explosiveness: 1.2,
  yardsPerPlay: 6.5,
  pointsPerGame: 30,
  ...o,
});
const row = (
  id: number,
  school: string,
  o: Partial<TeamSeasonRow> = {},
): TeamSeasonRow => ({
  team: {
    id,
    school,
    mascot: "",
    abbreviation: school.slice(0, 4).toUpperCase(),
    conference: "SEC",
    color: "#9e2638",
    altColor: "#fff",
    alternateNames: [],
  } as Team,
  record: { wins: 5, losses: 1, ties: 0 },
  spOverall: 20,
  spOffense: 30,
  spDefense: 10,
  off: side(),
  def: side({ pointsPerGame: 14 }),
  ...o,
});
const rows = [
  row(1, "Alpha", { spOverall: 30.2, spDefense: 11.8 }),
  row(2, "Bravo", { spOverall: 25.1, spDefense: 8.4 }),
  row(3, "Charlie", { spOverall: 10, spDefense: 15.2 }),
  row(4, "Delta", { spOverall: null, spDefense: null, record: null }),
];

const bodyNames = () =>
  within(document.querySelector("tbody")!)
    .getAllByRole("row")
    .map((r) =>
      r.querySelectorAll("td")[1]?.textContent?.replace("SEC", "").trim(),
    );

beforeEach(() => {
  replace.mockClear();
  query = "";
  window.history.replaceState(null, "", "/teams");
});
afterEach(cleanup);

describe("TeamsView", () => {
  const view = (extra: Partial<React.ComponentProps<typeof TeamsView>> = {}) =>
    render(
      <TeamsView
        rows={rows}
        filters={{ conf: null, q: "" }}
        initialSort={DEFAULT_SORT}
        {...extra}
      />,
    );

  it("renders rows sorted by SP+ with nulls last, formatted values and the count", () => {
    view();
    expect(bodyNames()).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
    expect(screen.getByText("4 teams")).toBeInTheDocument();
    expect(
      screen.getByText(/Sorted by SP\+ Overall \(best first\)/),
    ).toBeInTheDocument();
    const first = within(document.querySelector("tbody")!).getAllByRole(
      "row",
    )[0];
    expect(within(first).getByText("30.2")).toBeInTheDocument();
    expect(within(first).getByText("5-1")).toBeInTheDocument();
    expect(within(first).getAllByText("50.0%")).toHaveLength(2); // offense and defense
    // missing data renders em dashes, never NaN
    const last = within(document.querySelector("tbody")!).getAllByRole(
      "row",
    )[3];
    expect(last.textContent).toContain("—");
    expect(last.textContent).not.toMatch(/NaN|undefined|null/);
  });

  it("numbers rows by current position (RK)", () => {
    view();
    const ranks = within(document.querySelector("tbody")!)
      .getAllByRole("row")
      .map((r) => r.querySelector("td")!.textContent);
    expect(ranks).toEqual(["1", "2", "3", "4"]);
  });

  it("first click on DEF sorts best-first, second flips, and the URL follows", async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole("button", { name: "DEF" }));
    expect(bodyNames()).toEqual(["Bravo", "Alpha", "Charlie", "Delta"]);
    expect(screen.getByRole("columnheader", { name: "DEF" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(
      screen.getByText(/Sorted by Def SP\+ \(best first\)/),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?sort=spDefense&dir=asc");

    await user.click(screen.getByRole("button", { name: "DEF" }));
    expect(bodyNames()).toEqual(["Charlie", "Alpha", "Bravo", "Delta"]); // null still last
    expect(screen.getByRole("columnheader", { name: "DEF" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(window.location.search).toBe("?sort=spDefense&dir=desc");
  });

  it("returns to a clean URL when sorting back to the default", async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole("button", { name: "TEAM" })); // asc
    expect(window.location.search).toBe("?sort=team&dir=asc");
    await user.click(screen.getByRole("button", { name: "OVR" })); // desc = default
    expect(window.location.search).toBe("");
  });

  it("keeps other URL params when sorting", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/teams?conf=SEC&q=al");
    view({ filters: { conf: "SEC", q: "al" } });
    await user.click(screen.getAllByRole("button", { name: "PTS/G" })[0]);
    expect(window.location.search).toContain("conf=SEC");
    expect(window.location.search).toContain("q=al");
    expect(window.location.search).toContain("sort=");
  });

  it("shows filter chips with removal links and a clear link", () => {
    query = "conf=SEC&q=al&sort=team&dir=asc";
    view({ filters: { conf: "SEC", q: "al" } });
    expect(
      screen.getByRole("link", { name: "Remove filter SEC" }),
    ).toHaveAttribute("href", "/teams?q=al&sort=team&dir=asc");
    expect(
      screen.getByRole("link", { name: "Remove filter al" }),
    ).toHaveAttribute("href", "/teams?conf=SEC&sort=team&dir=asc");
    expect(
      screen.getAllByRole("link", { name: "Clear filters" })[0],
    ).toHaveAttribute("href", "/teams?sort=team&dir=asc");
  });

  it("shows the empty state inside the table", () => {
    view({ rows: [], filters: { conf: "SEC", q: "zzzz" } });
    expect(
      screen.getByText("No teams match these filters"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 teams")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "OVR" }),
    ).toBeInTheDocument(); // headings stay
  });

  it("uses singular for one team", () => {
    view({ rows: [rows[0]] });
    expect(screen.getByText("1 team")).toBeInTheDocument();
  });
});

describe("TeamsSkeleton", () => {
  it("renders non-interactive headings and 12 placeholder rows", () => {
    render(<TeamsSkeleton />);
    expect(
      screen.getByRole("status", { name: "Loading teams" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "OVR" })).toBeDisabled();
  });
});

describe("TeamsFilterBar", () => {
  const props = {
    filters: { conf: null, q: "" },
    season: 2026,
    currentSeason: 2026,
    seasons: [2026, 2025],
    conferences: ["ACC", "SEC"],
  };

  it("changes conference and keeps the current sort", () => {
    query = "sort=spDefense&dir=asc";
    render(<TeamsFilterBar {...props} />);
    fireEvent.change(screen.getByLabelText("Conference"), {
      target: { value: "SEC" },
    });
    expect(replace.mock.calls.at(-1)?.[0]).toBe(
      "/teams?conf=SEC&sort=spDefense&dir=asc",
    );
    fireEvent.change(screen.getByLabelText("Conference"), {
      target: { value: "All" },
    });
    expect(replace.mock.calls.at(-1)?.[0]).toBe(
      "/teams?sort=spDefense&dir=asc",
    );
  });

  it("changes season; the current season is the default (no param)", () => {
    render(<TeamsFilterBar {...props} />);
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "2025" },
    });
    expect(replace.mock.calls.at(-1)?.[0]).toBe("/teams?season=2025");
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "2026" },
    });
    expect(replace.mock.calls.at(-1)?.[0]).toBe("/teams");
  });

  describe("search", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("debounces typing into one URL update", () => {
      render(<TeamsFilterBar {...props} />);
      const input = screen.getByLabelText("Search a team");
      for (const v of ["t", "te", "tex"])
        fireEvent.change(input, { target: { value: v } });
      expect(replace).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(300));
      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace.mock.calls[0][0]).toBe("/teams?q=tex");
    });

    it("clears with the x button and follows chip removal without clobbering typing", () => {
      const { rerender } = render(
        <TeamsFilterBar {...props} filters={{ conf: null, q: "tex" }} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
      act(() => vi.advanceTimersByTime(300));
      expect(replace.mock.calls.at(-1)?.[0]).toBe("/teams");

      rerender(
        <TeamsFilterBar {...props} filters={{ conf: null, q: "zzz" }} />,
      );
      expect(screen.getByLabelText("Search a team")).toHaveValue("zzz");
      rerender(<TeamsFilterBar {...props} filters={{ conf: null, q: "" }} />);
      expect(screen.getByLabelText("Search a team")).toHaveValue("");
    });
  });
});
