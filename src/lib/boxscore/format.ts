import type { BoxScore, ScoringPlay } from "../cfbd/models";
import { periodLabel } from "../scoreboard/status";
import { coverSide, favoriteResult, spreadLabel } from "../utils/spread";

/** "OT" for one overtime, "2 OT" for two, null for a game that ended in regulation. */
export function overtimeLabel(lineScores: number[] | null): string | null {
  const extra = (lineScores?.length ?? 0) - 4;
  if (extra <= 0) return null;
  return extra === 1 ? "OT" : `${extra} OT`;
}

/** Line score column heading: "1".."4", then "OT", "2OT". */
export function periodHeading(period: number): string {
  return period <= 4 ? String(period) : periodLabel(period);
}

/** Line score cells for one side, padded with null to at least four periods. */
export function lineScoreCells(lineScores: number[] | null, columns: number) {
  return Array.from({ length: columns }, (_, i) => lineScores?.[i] ?? null);
}

/** Number of line score columns: four quarters, more if either side played overtime. */
export function lineScoreColumns(box: Pick<BoxScore, "game">): number {
  const { home, away } = box.game;
  return Math.max(
    4,
    home.lineScores?.length ?? 0,
    away.lineScores?.length ?? 0,
  );
}

/** "Q2 13:15", or "OT" (no clock in overtime). */
export function playPeriod(p: Pick<ScoringPlay, "period" | "clock">): string {
  return p.clock
    ? `${periodLabel(p.period)} ${p.clock}`
    : periodLabel(p.period);
}

/** "12 plays, 75 yds, 4:51" ("1 play"; no time when unknown). */
export function driveDetail(
  p: Pick<ScoringPlay, "plays" | "yards" | "elapsed">,
): string {
  const parts = [
    `${p.plays} ${p.plays === 1 ? "play" : "plays"}`,
    `${p.yards} yds`,
  ];
  if (p.elapsed) parts.push(p.elapsed);
  return parts.join(", ");
}

/** "-148", "+124". */
export function formatMoneyline(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export type LineCell = { label: string; value: string; sub?: string };

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * The spread and result strip. Result cells only fill in for a final game; the favorite is the
 * team in the spread label (not the home team) and "covered" describes that team.
 */
export function buildLineCells(box: BoxScore): LineCell[] | null {
  const { line, game, away, home } = box;
  if (!line) return null;
  const final = game.status === "final";
  const hp = game.home.points;
  const ap = game.away.points;
  const scored = final && hp !== null && ap !== null;

  const label = spreadLabel(
    line.spreadHome,
    home.abbreviation,
    away.abbreviation,
  );

  let ats: Pick<LineCell, "value" | "sub"> = {
    value: game.status === "live" ? "In progress" : "—",
  };
  if (scored && line.spreadHome !== null) {
    const side = coverSide(hp, ap, line.spreadHome);
    // A pick'em has no favorite, so it reads "Covered" for whoever won against zero.
    const result =
      favoriteResult(hp, ap, line.spreadHome) ??
      (side === "push" ? "push" : "covered");
    ats = {
      value: { covered: "Covered", missed: "Missed", push: "Push" }[result],
      sub:
        side === "push"
          ? undefined
          : `${(side === "home" ? home : away).abbreviation} covered`,
    };
  }

  let totalResult: Pick<LineCell, "value" | "sub"> = { value: "—" };
  if (scored && line.overUnder !== null) {
    const sum = hp + ap;
    totalResult = {
      value:
        sum > line.overUnder ? "Over" : sum < line.overUnder ? "Under" : "Push",
      sub: `${sum} pts`,
    };
  }

  const moneylines = [
    line.awayMoneyline !== null
      ? `${away.abbreviation} ${formatMoneyline(line.awayMoneyline)}`
      : null,
    line.homeMoneyline !== null
      ? `${home.abbreviation} ${formatMoneyline(line.homeMoneyline)}`
      : null,
  ].filter((s): s is string => s !== null);

  return [
    {
      label: "SPREAD",
      value: label ?? "—",
      sub: label ? line.provider : undefined,
    },
    { label: "AGAINST THE SPREAD", ...ats },
    {
      label: "TOTAL",
      value: line.overUnder === null ? "—" : num(line.overUnder),
    },
    { label: "TOTAL RESULT", ...totalResult },
    {
      label: "MONEYLINE",
      value: moneylines.length ? moneylines.join(" · ") : "—",
    },
  ];
}
