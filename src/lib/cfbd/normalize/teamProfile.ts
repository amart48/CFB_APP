import type {
  PositionGroup,
  RecordSplit,
  RosterPlayer,
  ScheduleRow,
  TeamGamePpa,
  TeamLeader,
  TeamRecord,
} from "../models";
import type {
  RawCoach,
  RawGame,
  RawPlayerStat,
  RawPpaTeamGame,
  RawRecord,
  RawRosterPlayer,
} from "../schemas";
import { classLabel } from "./playerProfile";

/** A team's games in date order, from that team's point of view. */
export function normalizeSchedule(
  games: RawGame[],
  teamId: number,
): ScheduleRow[] {
  return games
    .filter((g) => g.homeId === teamId || g.awayId === teamId)
    .map((g): ScheduleRow => {
      const isHome = g.homeId === teamId;
      const pf = (isHome ? g.homePoints : g.awayPoints) ?? null;
      const pa = (isHome ? g.awayPoints : g.homePoints) ?? null;
      const played = g.completed && pf !== null && pa !== null;
      return {
        gameId: g.id,
        week: g.week,
        seasonType: g.seasonType,
        startUtc: g.startDate,
        startTbd: g.startTimeTBD ?? false,
        opponent: isHome
          ? { id: g.awayId, name: g.awayTeam }
          : { id: g.homeId, name: g.homeTeam },
        // On a neutral site "home" and "away" are only labels.
        site: g.neutralSite ? "neutral" : isHome ? "home" : "away",
        venue: g.venue ?? "",
        conferenceGame: g.conferenceGame ?? false,
        completed: g.completed,
        pointsFor: pf,
        pointsAgainst: pa,
        result: played ? (pf > pa ? "W" : pf < pa ? "L" : "T") : null,
      };
    })
    .sort(
      (a, b) =>
        Date.parse(a.startUtc) - Date.parse(b.startUtc) || a.week - b.week,
    );
}

const split = (t: RawRecord["total"] | null | undefined): RecordSplit | null =>
  t ? { wins: t.wins ?? 0, losses: t.losses ?? 0, ties: t.ties ?? 0 } : null;

export function normalizeTeamRecord(
  rows: RawRecord[],
  teamId: number,
): TeamRecord {
  const r = rows.find((x) => x.teamId === teamId);
  return {
    overall: split(r?.total),
    conference: split(r?.conferenceGames),
    home: split(r?.homeGames),
    away: split(r?.awayGames),
    expectedWins: r?.expectedWins ?? null,
  };
}

/** "6-0" (adds "-T" only when there are ties). */
export function formatSplit(s: RecordSplit | null): string {
  if (!s) return "—";
  return s.ties > 0
    ? `${s.wins}-${s.losses}-${s.ties}`
    : `${s.wins}-${s.losses}`;
}

/** The coach who coached the most games for the school that season (handles mid-season changes). */
export function headCoach(
  coaches: RawCoach[],
  school: string,
  year: number,
): string | null {
  const candidates = coaches
    .map((c) => ({
      coach: c,
      season: c.seasons.find((s) => s.school === school && s.year === year),
    }))
    .filter((x) => x.season);
  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) =>
    (b.season?.games ?? 0) > (a.season?.games ?? 0) ? b : a,
  );
  const name =
    `${best.coach.firstName ?? ""} ${best.coach.lastName ?? ""}`.trim();
  return name || null;
}

export function normalizeTeamPpaGames(rows: RawPpaTeamGame[]): TeamGamePpa[] {
  return rows
    .map((g) => ({
      week: g.week,
      opponent: g.opponent ?? "",
      offense: g.offense.overall ?? null,
      defense: g.defense.overall ?? null,
    }))
    .sort((a, b) => a.week - b.week);
}

const GROUP_BY_POSITION: Record<string, PositionGroup> = {
  QB: "QB",
  RB: "RB",
  FB: "RB",
  WR: "WR",
  TE: "TE",
  OL: "OL",
  OT: "OL",
  OG: "OL",
  C: "OL",
  DL: "DL",
  DE: "DL",
  DT: "DL",
  NT: "DL",
  EDGE: "DL",
  LB: "LB",
  OLB: "LB",
  ILB: "LB",
  MLB: "LB",
  DB: "DB",
  CB: "DB",
  S: "DB",
  FS: "DB",
  SS: "DB",
  PK: "ST",
  K: "ST",
  P: "ST",
  LS: "ST",
};

export const positionGroup = (
  position: string | null | undefined,
): PositionGroup =>
  GROUP_BY_POSITION[(position ?? "").toUpperCase()] ?? "OTHER";

export const GROUP_ORDER: PositionGroup[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "OL",
  "DL",
  "LB",
  "DB",
  "ST",
  "OTHER",
];

export type RosterFilter = "all" | "offense" | "defense" | "special";

const FILTER_GROUPS: Record<Exclude<RosterFilter, "all">, PositionGroup[]> = {
  offense: ["QB", "RB", "WR", "TE", "OL"],
  defense: ["DL", "LB", "DB"],
  special: ["ST"],
};

export const inRosterFilter = (p: RosterPlayer, f: RosterFilter) =>
  f === "all" || FILTER_GROUPS[f].includes(p.group);

/** Roster by position group, then jersey number, then name. */
export function normalizeRoster(raw: RawRosterPlayer[]): RosterPlayer[] {
  return raw
    .map((p): RosterPlayer => ({
      id: p.id,
      name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
      jersey: p.jersey ?? null,
      position: p.position ?? "",
      group: positionGroup(p.position),
      classYear: classLabel(p.year),
      heightInches: p.height ?? null,
      weightLbs: p.weight ?? null,
      hometown: p.homeCity
        ? p.homeState
          ? `${p.homeCity}, ${p.homeState}`
          : p.homeCity
        : null,
    }))
    .sort(
      (a, b) =>
        GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
        (a.jersey ?? 999) - (b.jersey ?? 999) ||
        a.name.localeCompare(b.name),
    );
}

type LeaderDef = {
  key: string;
  label: string;
  category: string;
  stat: string;
  unit: string;
  detail: (s: Record<string, number>) => string;
};

const n = (s: Record<string, number>, k: string) => s[k] ?? 0;
const half = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const LEADERS: LeaderDef[] = [
  {
    key: "passing",
    label: "PASSING",
    category: "passing",
    stat: "YDS",
    unit: "yds",
    detail: (s) => `${n(s, "TD")} TD · ${n(s, "INT")} INT`,
  },
  {
    key: "rushing",
    label: "RUSHING",
    category: "rushing",
    stat: "YDS",
    unit: "yds",
    detail: (s) => `${n(s, "TD")} TD · ${(s.YPC ?? 0).toFixed(1)} Y/C`,
  },
  {
    key: "receiving",
    label: "RECEIVING",
    category: "receiving",
    stat: "YDS",
    unit: "yds",
    detail: (s) => `${n(s, "REC")} REC · ${n(s, "TD")} TD`,
  },
  {
    key: "tackles",
    label: "TACKLES",
    category: "defensive",
    stat: "TOT",
    unit: "tot",
    detail: (s) => `${half(n(s, "TFL"))} TFL`,
  },
  {
    key: "sacks",
    label: "SACKS",
    category: "defensive",
    stat: "SACKS",
    unit: "sacks",
    detail: (s) => `${n(s, "QB HUR")} HUR`,
  },
  {
    key: "interceptions",
    label: "INTERCEPTIONS",
    category: "interceptions",
    stat: "INT",
    unit: "int",
    detail: (s) => `${n(s, "YDS")} yds`,
  },
];

/** The team's top player in each headline stat. Ties go to the earlier name; zero values are skipped. */
export function teamLeaders(rows: RawPlayerStat[]): TeamLeader[] {
  const players = new Map<
    string,
    { name: string; position: string; stats: Record<string, number> }
  >();
  for (const r of rows) {
    const v = Number.parseFloat(String(r.stat));
    if (!Number.isFinite(v)) continue;
    const key = `${r.playerId}|${r.category}`;
    const p = players.get(key) ?? {
      name: r.player,
      position: r.position ?? "",
      stats: {},
    };
    p.stats[r.statType] = v;
    players.set(key, p);
  }
  const out: TeamLeader[] = [];
  for (const def of LEADERS) {
    let best: {
      id: string;
      p: { name: string; position: string; stats: Record<string, number> };
    } | null = null;
    for (const [key, p] of players) {
      const [id, category] = key.split("|");
      if (category !== def.category || (p.stats[def.stat] ?? 0) <= 0) continue;
      const better =
        !best ||
        p.stats[def.stat] > best.p.stats[def.stat] ||
        (p.stats[def.stat] === best.p.stats[def.stat] &&
          p.name.localeCompare(best.p.name) < 0);
      if (better) best = { id, p };
    }
    if (best) {
      out.push({
        key: def.key,
        label: def.label,
        playerId: best.id,
        name: best.p.name,
        position: best.p.position,
        value: best.p.stats[def.stat],
        unit: def.unit,
        detail: def.detail(best.p.stats),
      });
    }
  }
  return out;
}
