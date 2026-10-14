import { cleanGameClock } from "../../utils/time";
import { cleanTv } from "../../utils/tv";
import type { GameRow, GameSide, GameStatus } from "../models";
import type { RawGame, RawScoreboardGame } from "../schemas";

type RankMap = Map<number, number>;

function side(
  teamId: number,
  points: number | null | undefined,
  lineScores: number[] | null | undefined,
  ranks: RankMap,
): GameSide {
  return {
    teamId,
    points: points ?? null,
    apRank: ranks.get(teamId) ?? null,
    lineScores: lineScores ?? null,
  };
}

/** Verified live value: "in_progress" (with period, clock, situation). Anything not scheduled/completed counts as live. */
export function scoreboardStatus(status: string): GameStatus {
  if (status === "scheduled") return "scheduled";
  if (status === "completed") return "final";
  return "live";
}

export function normalizeScoreboardGame(
  g: RawScoreboardGame,
  ranks: RankMap,
): GameRow {
  const status = scoreboardStatus(g.status);
  return {
    id: g.id,
    startUtc: g.startDate,
    startTbd: g.startTimeTBD ?? false,
    status,
    // Only trust period/clock while live, and only when present.
    period: status === "live" ? (g.period ?? null) : null,
    clock: status === "live" ? cleanGameClock(g.clock) : null,
    home: side(g.homeTeam.id, g.homeTeam.points, g.homeTeam.lineScores, ranks),
    away: side(g.awayTeam.id, g.awayTeam.points, g.awayTeam.lineScores, ranks),
    tv: cleanTv(g.tv),
    spreadHome: g.betting?.spread ?? null,
    overUnder: g.betting?.overUnder ?? null,
    neutralSite: g.neutralSite ?? false,
    venue: g.venue?.name ?? "",
    conferenceGame: g.conferenceGame ?? false,
  };
}

/** Past weeks: /games plus spreads and totals from /lines. No TV network is available. */
export function normalizeGame(
  g: RawGame,
  ranks: RankMap,
  spreads: Map<number, number>,
  totals: Map<number, number> = new Map(),
): GameRow {
  return {
    id: g.id,
    startUtc: g.startDate,
    startTbd: g.startTimeTBD ?? false,
    status: g.completed ? "final" : "scheduled",
    period: null,
    clock: null,
    home: side(g.homeId, g.homePoints, g.homeLineScores, ranks),
    away: side(g.awayId, g.awayPoints, g.awayLineScores, ranks),
    tv: null,
    spreadHome: spreads.get(g.id) ?? null,
    overUnder: totals.get(g.id) ?? null,
    neutralSite: g.neutralSite ?? false,
    venue: g.venue ?? "",
    conferenceGame: g.conferenceGame ?? false,
  };
}

/** Top 25 filter: a game passes if either team is in the AP map. */
export function isTop25Game(g: GameRow): boolean {
  return g.home.apRank !== null || g.away.apRank !== null;
}
