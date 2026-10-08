import {
  CATEGORY_BY_ID,
  type PlayerCategoryId,
} from "../../players/categories";
import type {
  PlayerBio,
  PlayerGameLog,
  PlayerStint,
  SituationSplits,
} from "../models";
import type {
  RawPlayerSearch,
  RawPlayerStat,
  RawPlayerUsage,
  RawPpaPlayerGame,
  RawPpaPlayerSeason,
  RawRosterPlayer,
} from "../schemas";

const CLASS_LABELS: Record<number, string> = {
  1: "Freshman",
  2: "Sophomore",
  3: "Junior",
  4: "Senior",
  5: "Graduate",
};

export const classLabel = (year: number | null | undefined): string | null =>
  year == null ? null : (CLASS_LABELS[year] ?? null);

/** 76 to 6'4". */
export function formatHeight(inches: number | null | undefined): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/** Bio from the roster (class year, hometown parts) with the search result as a fallback. */
export function buildPlayerBio(
  id: string,
  roster: RawRosterPlayer | undefined,
  search: RawPlayerSearch | undefined,
): PlayerBio | null {
  if (!roster && !search) return null;
  const name =
    search?.name ??
    `${roster?.firstName ?? ""} ${roster?.lastName ?? ""}`.trim();
  const hometown =
    roster?.homeCity && roster.homeState
      ? `${roster.homeCity}, ${roster.homeState}`
      : (roster?.homeCity ?? search?.hometown ?? null);
  return {
    id,
    name,
    position: roster?.position ?? search?.position ?? "",
    jersey: roster?.jersey ?? search?.jersey ?? null,
    classYear: classLabel(roster?.year),
    heightInches: roster?.height ?? search?.height ?? null,
    weightLbs: roster?.weight ?? search?.weight ?? null,
    hometown,
  };
}

export function playerStints(
  search: RawPlayerSearch | undefined,
): PlayerStint[] {
  return [...(search?.teamStints ?? [])].sort(
    (a, b) => a.startYear - b.startYear,
  );
}

/** The team a player was on in a season, per their career stints. */
export function teamForSeason(
  stints: PlayerStint[],
  season: number,
): string | null {
  return (
    stints.find((s) => season >= s.startYear && season <= s.endYear)?.team ??
    null
  );
}

/** Every season the player was active, oldest first (the season picker). */
export function activeSeasons(stints: PlayerStint[], upTo: number): number[] {
  const seasons = new Set<number>();
  for (const s of stints) {
    for (let y = s.startYear; y <= Math.min(s.endYear, upTo); y++)
      seasons.add(y);
  }
  return [...seasons].sort((a, b) => a - b);
}

export type PlayerCategoryStats = {
  category: PlayerCategoryId;
  stats: Record<string, number>;
};

/** One player's stats from a team slice, grouped by the categories we show (fumbles etc. skipped). */
export function playerCategoryStats(
  rows: RawPlayerStat[],
  playerId: string,
): PlayerCategoryStats[] {
  const byCategory = new Map<PlayerCategoryId, Record<string, number>>();
  for (const r of rows) {
    if (r.playerId !== playerId) continue;
    const category = CATEGORY_BY_ID.get(r.category as PlayerCategoryId);
    if (!category) continue;
    const value = Number.parseFloat(String(r.stat));
    if (!Number.isFinite(value)) continue;
    const stats = byCategory.get(category.id) ?? {};
    stats[r.statType] = value;
    byCategory.set(category.id, stats);
  }
  // keep the leaderboard tab order
  return [...CATEGORY_BY_ID.keys()]
    .filter((id) => byCategory.has(id))
    .map((id) => ({ category: id, stats: byCategory.get(id)! }));
}

const PRIMARY_BY_POSITION: Record<string, PlayerCategoryId> = {
  QB: "passing",
  RB: "rushing",
  FB: "rushing",
  WR: "receiving",
  TE: "receiving",
  DL: "defensive",
  DE: "defensive",
  DT: "defensive",
  EDGE: "defensive",
  LB: "defensive",
  DB: "defensive",
  CB: "defensive",
  S: "defensive",
  PK: "kicking",
  K: "kicking",
  P: "punting",
};

/**
 * The category that best describes a player: by position when they have stats there, else the
 * first category they have stats in. Drives the rank row and the career table.
 */
export function primaryCategory(
  position: string,
  available: PlayerCategoryId[],
): PlayerCategoryId | null {
  const byPosition = PRIMARY_BY_POSITION[position];
  if (byPosition && available.includes(byPosition)) return byPosition;
  return available[0] ?? null;
}

const splits = (
  s: RawPpaPlayerSeason["averagePPA"] | undefined,
): SituationSplits | null =>
  s
    ? {
        all: s.all ?? null,
        pass: s.pass ?? null,
        rush: s.rush ?? null,
        firstDown: s.firstDown ?? null,
        secondDown: s.secondDown ?? null,
        thirdDown: s.thirdDown ?? null,
        standardDowns: s.standardDowns ?? null,
        passingDowns: s.passingDowns ?? null,
      }
    : null;

export const playerPpa = (rows: RawPpaPlayerSeason[], id: string) =>
  splits(rows.find((r) => r.id === id)?.averagePPA);
export function playerUsage(
  rows: RawPlayerUsage[],
  id: string,
): SituationSplits | null {
  const u = rows.find((r) => r.id === id)?.usage;
  return u ? splits({ ...u, all: u.overall }) : null;
}

/** Regular-season games in week order. */
export function playerGameLog(
  rows: RawPpaPlayerGame[],
  id: string,
): PlayerGameLog[] {
  return rows
    .filter((r) => r.id === id)
    .map((r) => ({
      week: r.week,
      opponent: r.opponent ?? "",
      ppaAll: r.averagePPA.all ?? null,
      ppaPass: r.averagePPA.pass ?? null,
      ppaRush: r.averagePPA.rush ?? null,
    }))
    .sort((a, b) => a.week - b.week);
}
