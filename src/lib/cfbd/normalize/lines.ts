import type { BoxLine } from "../models";
import type { RawGameLines } from "../schemas";

const PREFERRED_PROVIDER = "DraftKings";

/** The provider line to show: DraftKings, else the first provider that has a spread. */
export function pickLine(lines: RawGameLines["lines"]) {
  const withSpread = lines.filter((l) => l.spread != null);
  return (
    withSpread.find((l) => l.provider === PREFERRED_PROVIDER) ?? withSpread[0]
  );
}

/** gameId to home-perspective spread. Prefers DraftKings, else the first provider with a spread. */
export function spreadByGame(lines: RawGameLines[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const g of lines) {
    const pick = pickLine(g.lines);
    if (pick?.spread != null) map.set(g.id, pick.spread);
  }
  return map;
}

/** Full line (spread, total, moneylines) for one game, or null when no provider has a spread. */
export function normalizeBoxLine(lines: RawGameLines[]): BoxLine | null {
  const pick = lines.length > 0 ? pickLine(lines[0].lines) : undefined;
  if (!pick) return null;
  return {
    provider: pick.provider,
    spreadHome: pick.spread ?? null,
    spreadOpenHome: pick.spreadOpen ?? null,
    overUnder: pick.overUnder ?? null,
    homeMoneyline: pick.homeMoneyline ?? null,
    awayMoneyline: pick.awayMoneyline ?? null,
  };
}
