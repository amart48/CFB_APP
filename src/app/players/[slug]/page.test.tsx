// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerProfile } from "@/lib/cfbd/loaders";
import PlayerPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/players/x",
}));
vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));
// async server panels are covered in the component tests
vi.mock("@/components/player/CareerPanel", () => ({
  CareerPanel: () => <div data-testid="career" />,
}));
vi.mock("@/components/player/SeasonStatsPanel", () => ({
  SeasonStatsPanel: () => <div data-testid="season" />,
}));
const loadPlayerProfile = vi.fn();
vi.mock("@/lib/cfbd/loaders", () => ({
  loadPlayerProfile: (...a: unknown[]) => loadPlayerProfile(...a),
}));

const profile = (primary: PlayerProfile["primary"]): PlayerProfile => ({
  season: 2026,
  currentSeason: 2026,
  seasons: [2026],
  stints: [],
  bio: {
    id: "1",
    name: "Test Player",
    position: "LB",
    jersey: 9,
    classYear: null,
    heightInches: null,
    weightLbs: null,
    hometown: null,
  },
  team: null,
  teamName: "Auburn",
  categories: [],
  primary,
  usage: null,
  ppa: null,
  games: [],
});

const render_ = async (slug: string, sp: Record<string, string> = {}) =>
  render(
    await PlayerPage({
      params: Promise.resolve({ slug }),
      searchParams: Promise.resolve(sp),
    } as never),
  );

beforeEach(() => {
  loadPlayerProfile.mockReset();
});
afterEach(cleanup);

describe("player page", () => {
  it("shows 'Player not found' for a malformed slug without calling the API", async () => {
    await render_("not-a-slug");
    expect(screen.getByText("Player not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Player Stats" }),
    ).toHaveAttribute("href", "/players");
    expect(loadPlayerProfile).not.toHaveBeenCalled();
  });
  it("shows 'Player not found' when the loader finds nobody", async () => {
    loadPlayerProfile.mockResolvedValue({ kind: "not-found" });
    await render_("999-nobody");
    expect(screen.getByText("Player not found")).toBeInTheDocument();
  });
  it("shows a friendly error when the data layer fails", async () => {
    loadPlayerProfile.mockImplementation(async () => {
      throw new Error("boom");
    });
    const original = console.error;
    console.error = vi.fn(); // the loader failure is logged; keep test output clean
    try {
      await render_("1-test-player");
    } finally {
      console.error = original;
    }
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load this player",
    );
  });
  it("passes the slug id, name hint, team and season to the loader (sanitizing junk)", async () => {
    loadPlayerProfile.mockResolvedValue({ kind: "not-found" });
    await render_("42-jose-ruiz", { team: "Texas A&M", season: "2024" });
    expect(loadPlayerProfile).toHaveBeenCalledWith({
      id: "42",
      name: "jose ruiz",
      team: "Texas A&M",
      season: 2024,
    });
    loadPlayerProfile.mockClear();
    await render_("42-jose-ruiz", { season: "abc" });
    expect(loadPlayerProfile).toHaveBeenCalledWith({
      id: "42",
      name: "jose ruiz",
      team: null,
      season: null,
    });
  });
  it("hides offense-only panels for a defender", async () => {
    loadPlayerProfile.mockResolvedValue({
      kind: "ok",
      profile: profile("defensive"),
    });
    await render_("1-test-player");
    expect(
      screen.getByRole("heading", { name: "Test Player" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("USAGE & PPA")).toBeNull();
    expect(screen.queryByText(/GAME LOG/)).toBeNull();
    expect(screen.getByTestId("season")).toBeInTheDocument();
  });
  it("shows usage and game log for an offensive player, even with no data yet", async () => {
    loadPlayerProfile.mockResolvedValue({
      kind: "ok",
      profile: profile("passing"),
    });
    await render_("1-test-player");
    expect(screen.getByText("USAGE & PPA")).toBeInTheDocument();
    expect(screen.getByText(/GAME LOG/)).toBeInTheDocument();
  });
});
