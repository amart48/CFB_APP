import type { TeamGameStats } from "../cfbd/models";
import { formatClock } from "../utils/time";

export type StatRow = {
  label: string;
  awayText: string;
  homeText: string;
  /** Bar lengths as 0-1 fractions of the larger value. */
  awayFill: number;
  homeFill: number;
  winner: "away" | "home" | "tie";
};

type Def = {
  label: string;
  value: (s: TeamGameStats) => number | null;
  text: (s: TeamGameStats) => string;
  /** Fewer is better (turnovers). */
  lowerWins?: boolean;
};

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const thirdPct = (s: TeamGameStats) =>
  s.thirdDown.att === 0 ? null : s.thirdDown.made / s.thirdDown.att;

const DEFS: Def[] = [
  {
    label: "Total Yards",
    value: (s) => s.totalYards,
    text: (s) => String(s.totalYards),
  },
  {
    label: "Rush Yards",
    value: (s) => s.rushYards,
    text: (s) => String(s.rushYards),
  },
  {
    label: "Pass Yards",
    value: (s) => s.passYards,
    text: (s) => String(s.passYards),
  },
  {
    label: "Yards/Play",
    value: (s) => s.yardsPerPlay,
    text: (s) => (s.yardsPerPlay === null ? "—" : s.yardsPerPlay.toFixed(1)),
  },
  {
    label: "Turnovers",
    value: (s) => s.turnovers,
    text: (s) => String(s.turnovers),
    lowerWins: true,
  },
  {
    label: "Third Down %",
    value: thirdPct,
    text: (s) => {
      const p = thirdPct(s);
      return p === null
        ? "—"
        : `${pct(p)} (${s.thirdDown.made}/${s.thirdDown.att})`;
    },
  },
  {
    label: "Time of Possession",
    value: (s) => s.possessionSeconds,
    text: (s) => formatClock(s.possessionSeconds),
  },
  {
    label: "Success Rate",
    value: (s) => s.successRate,
    text: (s) => (s.successRate === null ? "—" : pct(s.successRate)),
  },
];

function fills(a: number | null, h: number | null, lowerWins: boolean) {
  const av = a ?? 0;
  const hv = h ?? 0;
  const max = Math.max(av, hv);
  const awayFill = max > 0 ? av / max : 0;
  const homeFill = max > 0 ? hv / max : 0;
  let winner: StatRow["winner"] = "tie";
  if (a !== null && h !== null && a !== h) {
    winner = a > h !== lowerWins ? "away" : "home";
  } else if (a !== null && h === null) winner = "away";
  else if (h !== null && a === null) winner = "home";
  return { awayFill, homeFill, winner };
}

export function buildStatRows(
  away: TeamGameStats,
  home: TeamGameStats,
): StatRow[] {
  return DEFS.map((d) => ({
    label: d.label,
    awayText: d.text(away),
    homeText: d.text(home),
    ...fills(d.value(away), d.value(home), d.lowerWins ?? false),
  }));
}
