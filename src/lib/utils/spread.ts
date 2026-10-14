export type CoverSide = "home" | "away" | "push";
export type TotalResult = "over" | "under" | "push";
export type FavoriteResult = "covered" | "missed" | "push";

/** "TEX -7.5" style label. Spread is from the HOME team's perspective. */
export function spreadLabel(
  spreadHome: number | null,
  homeAbbr: string,
  awayAbbr: string,
): string | null {
  if (spreadHome === null) return null;
  if (spreadHome === 0) return "PK";
  return spreadHome < 0
    ? `${homeAbbr} ${spreadHome}`
    : `${awayAbbr} -${spreadHome}`;
}

/** Which side covered, for completed games. cover = (home - away) + spread. */
export function coverSide(
  homePoints: number,
  awayPoints: number,
  spreadHome: number,
): CoverSide {
  const cover = homePoints - awayPoints + spreadHome;
  if (cover > 0) return "home";
  if (cover < 0) return "away";
  return "push";
}

/** Whether the favorite (the team in the spread label) covered. Null for a pick'em. */
export function favoriteResult(
  homePoints: number,
  awayPoints: number,
  spreadHome: number,
): FavoriteResult | null {
  if (spreadHome === 0) return null;
  const side = coverSide(homePoints, awayPoints, spreadHome);
  if (side === "push") return "push";
  const favorite: CoverSide = spreadHome < 0 ? "home" : "away";
  return side === favorite ? "covered" : "missed";
}

/** Whether the combined score went over or under the total line. */
export function totalResult(
  homePoints: number,
  awayPoints: number,
  overUnder: number,
): TotalResult {
  const sum = homePoints + awayPoints;
  return sum > overUnder ? "over" : sum < overUnder ? "under" : "push";
}
