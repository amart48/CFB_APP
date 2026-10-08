import type { GameRow } from "../cfbd/models";
import { formatEtTime } from "../utils/time";

/** "Q1".."Q4", then "OT", "2OT", ... */
export function periodLabel(period: number): string {
  if (period <= 4) return `Q${period}`;
  return period === 5 ? "OT" : `${period - 4}OT`;
}

/**
 * "Q3 4:12" while the clock runs. CFBD has no halftime or between-quarters status: it keeps
 * `in_progress` with the clock at "0:00" (verified at halftime: period 2, clock "00:00", no
 * situation), so a stopped 0:00 clock reads "Halftime" after Q2 and "End Q1" etc. otherwise.
 */
export function liveClockLabel(period: number, clock: string): string {
  if (clock === "0:00") {
    return period === 2 ? "Halftime" : `End ${periodLabel(period)}`;
  }
  return `${periodLabel(period)} ${clock}`;
}

/** Left-hand status cell: "Final", "Q3 4:12", or "7:30 PM ET". */
export function statusLabel(g: GameRow): string {
  if (g.status === "final") return "Final";
  if (g.status === "live") {
    return g.period && g.clock ? liveClockLabel(g.period, g.clock) : "Live";
  }
  return g.startTbd ? "TBD" : `${formatEtTime(g.startUtc)} ET`;
}

/** Which side won a final game; null for ties, unfinished games or missing scores. */
export function winnerSide(g: GameRow): "home" | "away" | null {
  if (g.status !== "final" || g.home.points === null || g.away.points === null)
    return null;
  if (g.home.points === g.away.points) return null;
  return g.home.points > g.away.points ? "home" : "away";
}
