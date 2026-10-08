// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import TeamPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/teams/251-texas",
}));
vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));
// async and chart panels are covered in the component tests
vi.mock("@/components/team/RankingsPanel", () => ({
  RankingsPanel: () => <div data-testid="rankings" />,
}));
vi.mock("@/components/team/SummaryStrip", () => ({
  SummaryStrip: () => <div data-testid="strip" />,
}));
vi.mock("@/components/team/PpaChartPanel", () => ({
  PpaChartPanel: () => <div data-testid="ppa" />,
}));
vi.mock("@/components/team/SchedulePanel", () => ({
  SchedulePanel: () => <div data-testid="schedule" />,
}));
vi.mock("@/components/team/LeadersPanel", () => ({
  LeadersPanel: () => <div data-testid="leaders" />,
}));
const rosterProps = vi.fn();
vi.mock("@/components/team/RosterPanel", () => ({
  RosterPanel: (p: unknown) => {
    rosterProps(p);
    return <div data-testid="roster" />;
  },
}));
const loadTeamProfile = vi.fn();
vi.mock("@/lib/cfbd/loaders", () => ({
  loadTeamProfile: (...a: unknown[]) => loadTeamProfile(...a),
}));

const profile = {
  index: {
    season: 2026,
    currentSeason: 2026,
    isPast: false,
    teams: [],
    conferences: [],
  },
  team: {
    id: 251,
    school: "Texas",
    mascot: "Longhorns",
    abbreviation: "TEX",
    conference: "SEC",
    color: "#bf5700",
    altColor: "#fff",
    alternateNames: [],
  },
  season: 2026,
  record: {
    overall: null,
    conference: null,
    home: null,
    away: null,
    expectedWins: null,
  },
  coach: null,
  schedule: [],
  ppaGames: [],
  roster: [],
  leaders: [],
} as TeamProfile;

const renderPage = async (slug: string, sp: Record<string, string> = {}) =>
  render(
    await TeamPage({
      params: Promise.resolve({ slug }),
      searchParams: Promise.resolve(sp),
    } as never),
  );

beforeEach(() => {
  loadTeamProfile.mockReset();
  rosterProps.mockClear();
});
afterEach(cleanup);

describe("team page", () => {
  it("shows 'Team not found' for a malformed slug without calling the API", async () => {
    await renderPage("not-a-team");
    expect(screen.getByText("Team not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Team Stats" }),
    ).toHaveAttribute("href", "/teams");
    expect(loadTeamProfile).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric id even when it looks like a slug", async () => {
    await renderPage("12abc-foo");
    expect(screen.getByText("Team not found")).toBeInTheDocument();
    expect(loadTeamProfile).not.toHaveBeenCalled();
  });

  it("shows 'Team not found' when the loader finds nobody", async () => {
    loadTeamProfile.mockResolvedValue({ kind: "not-found" });
    await renderPage("999-nowhere");
    expect(screen.getByText("Team not found")).toBeInTheDocument();
  });

  it("shows a friendly error when the data layer fails", async () => {
    loadTeamProfile.mockImplementation(async () => {
      throw new Error("boom");
    });
    const original = console.error;
    console.error = vi.fn();
    try {
      await renderPage("251-texas");
    } finally {
      console.error = original;
    }
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load this team",
    );
  });

  it("passes the numeric id and a sanitized season to the loader", async () => {
    loadTeamProfile.mockResolvedValue({ kind: "not-found" });
    await renderPage("251-texas", { season: "2024" });
    expect(loadTeamProfile).toHaveBeenCalledWith({ id: 251, season: 2024 });
    loadTeamProfile.mockClear();
    await renderPage("251-texas", { season: "abc" });
    expect(loadTeamProfile).toHaveBeenCalledWith({ id: 251, season: null });
  });

  it("renders every section for a found team", async () => {
    loadTeamProfile.mockResolvedValue({ kind: "ok", profile });
    await renderPage("251-texas");
    expect(screen.getByRole("heading", { name: "Texas" })).toBeInTheDocument();
    for (const id of [
      "strip",
      "rankings",
      "ppa",
      "schedule",
      "leaders",
      "roster",
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it("passes the roster filter and keeps the season in the roster query; junk falls back to all", async () => {
    loadTeamProfile.mockResolvedValue({ kind: "ok", profile });
    await renderPage("251-texas", { season: "2025", group: "defense" });
    expect(rosterProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: "defense",
        query: "season=2025&group=defense",
      }),
    );
    cleanup();
    await renderPage("251-texas", { group: "nonsense" });
    expect(rosterProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: "all", query: "" }),
    );
  });
});
