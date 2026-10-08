// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerStatRow, Team } from "@/lib/cfbd/models";
import { CATEGORY_BY_ID } from "@/lib/players/categories";
import { parsePlayerFilters } from "@/lib/players/params";
import { CategoryTabs } from "./CategoryTabs";
import { PlayersFilterBar } from "./PlayersFilterBar";
import { PlayersResults } from "./PlayersResults";
import { PlayersSkeleton } from "./PlayersSkeleton";

const replace = vi.fn();
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));
const loadPlayerRows = vi.fn();
vi.mock("@/lib/cfbd/loaders", () => ({
  loadPlayerRows: (...a: unknown[]) => loadPlayerRows(...a),
}));

const cat = (id: string) => CATEGORY_BY_ID.get(id as never)!;
const team = (id: number, school: string, conference: string): Team => ({
  id,
  school,
  mascot: "",
  abbreviation: school.slice(0, 3).toUpperCase(),
  conference,
  color: "#9e2638",
  altColor: "#fff",
  alternateNames: [],
});
const texas = team(251, "Texas", "SEC");
const ohio = team(194, "Ohio State", "Big Ten");
const player = (
  i: number,
  name: string,
  t: Team,
  stats: Record<string, number>,
  o: Partial<PlayerStatRow> = {},
): PlayerStatRow => ({
  playerId: String(i),
  name,
  position: "QB",
  team: t,
  stats,
  qualified: true,
  ...o,
});
const index = {
  season: 2026,
  currentSeason: 2026,
  isPast: false,
  teams: [],
  conferences: ["SEC", "Big Ten"],
};

beforeEach(() => {
  replace.mockClear();
  loadPlayerRows.mockReset();
  query = "";
});
afterEach(cleanup);

describe("CategoryTabs", () => {
  it("lists all nine categories, marks the active one, and links keep other filters", () => {
    render(
      <CategoryTabs
        active={cat("rushing")}
        query="cat=rushing&conf=SEC&pos=RB&sort=YDS&dir=asc"
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(9);
    expect(screen.getByRole("link", { name: "Rushing" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Passing" })).toHaveAttribute(
      "href",
      "/players?conf=SEC",
    );
    expect(screen.getByRole("link", { name: "Defense" })).toHaveAttribute(
      "href",
      "/players?cat=defensive&conf=SEC",
    );
  });
});

describe("PlayersResults", () => {
  const run = async (q: string) => {
    const filters = parsePlayerFilters(
      Object.fromEntries(new URLSearchParams(q)),
    );
    render(await PlayersResults({ index, filters, query: q }));
    return filters;
  };
  const rowsText = () =>
    within(document.querySelector("tbody")!)
      .getAllByRole("row")
      .map((r) => r.textContent ?? "");

  const data = [
    player(1, "Ann Able", texas, {
      YDS: 1000,
      ATT: 100,
      PCT: 0.755,
      YPA: 10.3,
      TD: 9,
      INT: 2,
      COMPLETIONS: 75,
    }),
    player(2, "Bob Baker", ohio, {
      YDS: 1500,
      ATT: 120,
      PCT: 0.6,
      YPA: 8.1,
      TD: 12,
      INT: 1,
      COMPLETIONS: 72,
    }),
    player(
      3,
      "Cy Clark",
      texas,
      { YDS: 200, ATT: 10, PCT: 0.5, YPA: 5, TD: 0, INT: 0, COMPLETIONS: 5 },
      { qualified: false },
    ),
  ];

  it("filters unqualified players, sorts by yards, and formats values", async () => {
    loadPlayerRows.mockResolvedValue(data);
    await run("");
    const rows = rowsText();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Bob Baker");
    expect(rows[0]).toContain("1,500");
    expect(rows[1]).toContain("75.5%");
    expect(screen.getByText("2 players")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sorted by YDS \(best first\) · Min\. 15 pass attempts per team game/,
      ),
    ).toBeInTheDocument();
  });

  it("includes everyone when qualified-only is off", async () => {
    loadPlayerRows.mockResolvedValue(data);
    await run("qualified=0");
    expect(rowsText()).toHaveLength(3);
    expect(screen.getByText(/All players/)).toBeInTheDocument();
  });

  it("makes headings links that flip or start sorts, and sets aria-sort", async () => {
    loadPlayerRows.mockResolvedValue(data);
    await run("conf=SEC");
    expect(screen.getByRole("columnheader", { name: "YDS" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(screen.getByRole("link", { name: "YDS" })).toHaveAttribute(
      "href",
      "/players?conf=SEC&sort=YDS&dir=asc",
    );
    // passing INT is lower-is-better: first click ascends
    expect(screen.getByRole("link", { name: "INT" })).toHaveAttribute(
      "href",
      "/players?conf=SEC&sort=INT&dir=asc",
    );
    expect(screen.getByRole("link", { name: "TD" })).toHaveAttribute(
      "href",
      "/players?conf=SEC&sort=TD&dir=desc",
    );
  });

  it("applies conference, position and search filters with removable chips", async () => {
    loadPlayerRows.mockResolvedValue(data);
    await run("conf=SEC&q=ann");
    expect(rowsText()).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Remove filter SEC" }),
    ).toHaveAttribute("href", "/players?q=ann");
    expect(
      screen.getByRole("link", { name: "Remove filter ann" }),
    ).toHaveAttribute("href", "/players?conf=SEC");
  });

  it("shows an empty state with a clear action", async () => {
    loadPlayerRows.mockResolvedValue(data);
    await run("q=zzz");
    expect(
      screen.getByText("No players match these filters"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 players")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "YDS" }),
    ).toBeInTheDocument();
  });

  it("pages: shows the first 100 and offers 'Show 100 more' until everyone is shown", async () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      player(i, `P${String(i).padStart(3, "0")}`, texas, {
        YDS: 1000 - i,
        ATT: 100,
      }),
    );
    loadPlayerRows.mockResolvedValue(many);
    await run("");
    expect(rowsText()).toHaveLength(100);
    expect(screen.getByText("Showing 100 of 250 players")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show 100 more" })).toHaveAttribute(
      "href",
      "/players?limit=200",
    );
    cleanup();
    await run("limit=300");
    expect(rowsText()).toHaveLength(250);
    expect(screen.queryByRole("link", { name: /Show 100 more/ })).toBeNull();
    expect(screen.getByText("250 players")).toBeInTheDocument();
  });

  it("numbers rows by position and keeps ties deterministic", async () => {
    loadPlayerRows.mockResolvedValue([
      player(1, "Zed", texas, { YDS: 500, ATT: 100 }),
      player(2, "Amy", texas, { YDS: 500, ATT: 100 }),
    ]);
    await run("");
    const rows = rowsText();
    expect(rows[0]).toMatch(/^1Amy/);
    expect(rows[1]).toMatch(/^2Zed/);
  });

  it("shows no minimum note for defense and sorts non-integer stats", async () => {
    loadPlayerRows.mockResolvedValue([
      player(1, "A", texas, { TOT: 30, SACKS: 1.5 }, { position: "LB" }),
      player(2, "B", texas, { TOT: 20, SACKS: 3 }, { position: "DL" }),
    ]);
    await run("cat=defensive&sort=SACKS");
    expect(rowsText()[0]).toContain("B");
    expect(rowsText()[0]).toContain("3"); // whole number, no ".0"
    expect(rowsText()[1]).toContain("1.5");
    expect(
      screen.getByText(/No minimum for this category/),
    ).toBeInTheDocument();
  });

  it("shows a friendly error and never throws when the data layer fails", async () => {
    loadPlayerRows.mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await run("");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load player stats",
    );
    spy.mockRestore();
  });
});

describe("PlayersSkeleton", () => {
  it("renders non-interactive headings and 12 placeholder rows", () => {
    render(
      <PlayersSkeleton
        category={cat("passing")}
        sort={{ stat: "YDS", dir: "desc" }}
      />,
    );
    expect(
      screen.getByRole("status", { name: "Loading players" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("PlayersFilterBar", () => {
  const base = {
    filters: { conf: null, pos: null, q: "", qualified: true },
    season: 2026,
    currentSeason: 2026,
    seasons: [2026, 2025],
    conferences: ["ACC", "SEC"],
  };
  const last = () => replace.mock.calls.at(-1)?.[0];

  it("toggles qualified-only for categories with a minimum and hides it for those without", () => {
    const { rerender } = render(
      <PlayersFilterBar {...base} category={cat("passing")} />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Qualified only" }));
    expect(last()).toBe("/players?qualified=0");
    rerender(<PlayersFilterBar {...base} category={cat("defensive")} />);
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("offers the category's positions and keeps the category in the URL", () => {
    query = "cat=defensive&sort=SACKS&dir=desc";
    render(<PlayersFilterBar {...base} category={cat("defensive")} />);
    const options = within(screen.getByLabelText("Position"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual([
      "All",
      "DL",
      "DE",
      "DT",
      "EDGE",
      "LB",
      "DB",
      "CB",
      "S",
    ]);
    fireEvent.change(screen.getByLabelText("Position"), {
      target: { value: "LB" },
    });
    expect(last()).toBe("/players?cat=defensive&pos=LB&sort=SACKS&dir=desc");
  });

  it("keeps an out-of-list position selectable", () => {
    render(
      <PlayersFilterBar
        {...base}
        filters={{ ...base.filters, pos: "ATH" }}
        category={cat("passing")}
      />,
    );
    expect(
      within(screen.getByLabelText("Position"))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toContain("ATH");
  });

  it("changes conference and season", () => {
    render(<PlayersFilterBar {...base} category={cat("passing")} />);
    fireEvent.change(screen.getByLabelText("Conference"), {
      target: { value: "SEC" },
    });
    expect(last()).toBe("/players?conf=SEC");
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "2025" },
    });
    expect(last()).toBe("/players?season=2025");
  });

  describe("search", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    it("debounces typing into one URL update", () => {
      render(<PlayersFilterBar {...base} category={cat("passing")} />);
      const input = screen.getByLabelText("Search a player or team");
      for (const v of ["a", "ar", "arch"])
        fireEvent.change(input, { target: { value: v } });
      expect(replace).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(300));
      expect(replace).toHaveBeenCalledTimes(1);
      expect(last()).toBe("/players?q=arch");
    });
  });
});
