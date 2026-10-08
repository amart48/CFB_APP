import { cleanTv } from "../../utils/tv";
import { cleanGameClock, formatClock } from "../../utils/time";
import type {
  BoxCategoryId,
  BoxPlayerTable,
  BoxScore,
  ScoringPlay,
  Team,
} from "../models";
import type {
  RawDrive,
  RawGame,
  RawGamePlayers,
  RawScoreboardGame,
} from "../schemas";
import { normalizeGame, scoreboardStatus } from "./games";

type BoxCategory = {
  id: BoxCategoryId;
  /** Category name in /games/players. */
  api: string;
  label: string;
  /** Rows sort by this stat, high to low. */
  sort: string;
  columns: { stat: string; label: string }[];
};

const cols = (...stats: ([string] | [string, string])[]) =>
  stats.map(([stat, label]) => ({ stat, label: label ?? stat }));

export const BOX_CATEGORIES: BoxCategory[] = [
  {
    id: "passing",
    api: "passing",
    label: "Passing",
    sort: "YDS",
    columns: cols(["C/ATT"], ["YDS"], ["AVG"], ["TD"], ["INT"]),
  },
  {
    id: "rushing",
    api: "rushing",
    label: "Rushing",
    sort: "YDS",
    columns: cols(["CAR"], ["YDS"], ["AVG"], ["TD"], ["LONG"]),
  },
  {
    id: "receiving",
    api: "receiving",
    label: "Receiving",
    sort: "YDS",
    columns: cols(["REC"], ["YDS"], ["AVG"], ["TD"], ["LONG"]),
  },
  {
    id: "defense",
    api: "defensive",
    label: "Defense",
    sort: "TOT",
    columns: cols(
      ["TOT"],
      ["SOLO"],
      ["TFL"],
      ["SACKS"],
      ["PD"],
      ["QB HUR", "HUR"],
      ["TD"],
    ),
  },
];

const toNumber = (v: string | undefined) => {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : null;
};

/**
 * One team's player tables. CFBD sends category > type > athletes, so each athlete is pivoted
 * into one row per category, reading stats by type name. Athletes without the category's primary
 * stat are dropped; rows sort by it (high to low), ties by name. Empty categories are omitted.
 */
export function normalizeBoxPlayers(
  game: RawGamePlayers | undefined,
  side: "home" | "away",
  teamName: string,
): BoxPlayerTable[] {
  const team =
    game?.teams.find((t) => t.homeAway === side) ??
    game?.teams.find((t) => t.team === teamName);
  if (!team) return [];

  const tables: BoxPlayerTable[] = [];
  for (const cat of BOX_CATEGORIES) {
    const raw = team.categories.find((c) => c.name === cat.api);
    if (!raw) continue;
    const byPlayer = new Map<
      string,
      { name: string; stats: Map<string, string> }
    >();
    for (const type of raw.types) {
      for (const a of type.athletes) {
        const p = byPlayer.get(a.id) ?? {
          name: a.name.trim(),
          stats: new Map(),
        };
        p.stats.set(type.name, a.stat);
        byPlayer.set(a.id, p);
      }
    }
    const rows = [...byPlayer.entries()]
      .filter(([, p]) => p.stats.has(cat.sort))
      .map(([playerId, p]) => ({
        playerId,
        name: p.name,
        sortValue: toNumber(p.stats.get(cat.sort)) ?? -Infinity,
        values: cat.columns.map((c) => p.stats.get(c.stat) ?? "—"),
      }))
      .sort((a, b) => b.sortValue - a.sortValue || a.name.localeCompare(b.name))
      .map(({ playerId, name, values }) => ({ playerId, name, values }));
    if (rows.length > 0) {
      tables.push({
        category: cat.id,
        label: cat.label,
        columns: cat.columns,
        rows,
      });
    }
  }
  return tables;
}

const RESULT_LABELS: Record<string, string> = {
  TD: "Touchdown",
  FG: "Field goal",
  SF: "Safety",
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const clockText = (c: { minutes?: number | null; seconds?: number | null }) =>
  formatClock((c.minutes ?? 0) * 60 + (c.seconds ?? 0));

/**
 * Scoring drives only (drive `scoring: true`), with the running score from the drive end scores.
 * Those scores are trusted only when they never decrease and the last one equals the final score
 * (when it is known); otherwise every play carries null scores and the UI hides the columns.
 */
export function normalizeScoringPlays(
  drives: RawDrive[],
  game: Pick<RawGame, "id" | "homeTeam" | "homePoints" | "awayPoints">,
): ScoringPlay[] {
  const plays = drives
    .filter((d) => d.gameId === game.id && d.scoring)
    .sort((a, b) => (a.driveNumber ?? 0) - (b.driveNumber ?? 0))
    .map((d) => {
      const side: ScoringPlay["side"] =
        (d.isHomeOffense ?? d.offense === game.homeTeam) ? "home" : "away";
      const off = d.endOffenseScore ?? null;
      const def = d.endDefenseScore ?? null;
      const period = d.endPeriod ?? 1;
      const elapsedSeconds =
        (d.elapsed?.minutes ?? 0) * 60 + (d.elapsed?.seconds ?? 0);
      const raw = (d.driveResult ?? "").trim();
      const play: ScoringPlay = {
        driveId: d.id,
        side,
        period,
        clock: period > 4 || !d.endTime ? null : clockText(d.endTime),
        result:
          RESULT_LABELS[raw.toUpperCase()] ?? (raw ? titleCase(raw) : "Score"),
        plays: d.plays ?? 0,
        yards: d.yards ?? 0,
        elapsed: elapsedSeconds > 0 ? formatClock(elapsedSeconds) : null,
        homeScore: side === "home" ? off : def,
        awayScore: side === "home" ? def : off,
      };
      return play;
    });

  let ok = plays.every((p) => p.homeScore !== null && p.awayScore !== null);
  for (let i = 1; ok && i < plays.length; i++) {
    ok =
      plays[i].homeScore! >= plays[i - 1].homeScore! &&
      plays[i].awayScore! >= plays[i - 1].awayScore!;
  }
  const last = plays.at(-1);
  if (ok && last && game.homePoints != null && game.awayPoints != null) {
    ok =
      last.homeScore === game.homePoints && last.awayScore === game.awayPoints;
  }
  return ok
    ? plays
    : plays.map((p) => ({ ...p, homeScore: null, awayScore: null }));
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Game header row: `/games` plus, for unfinished games, the live `/scoreboard` entry (status,
 * clock, TV, fresher scores). Without a scoreboard entry an unfinished game counts as live only
 * if kickoff was under six hours ago. The live status is "in_progress" (verified); anything that is
 * not scheduled/completed counts as live, and the clock shows only when period and clock are present.
 */
export function normalizeBoxGame(
  g: RawGame,
  sb: RawScoreboardGame | undefined,
  ranks: Map<number, number>,
  spreadHome: number | null,
  now: Date,
): BoxScore["game"] {
  const spreads = new Map<number, number>();
  if (spreadHome !== null) spreads.set(g.id, spreadHome);
  const base = normalizeGame(g, ranks, spreads);
  const meta = { season: g.season, week: g.week, seasonType: g.seasonType };

  if (sb && !g.completed) {
    const status = scoreboardStatus(sb.status);
    const live = status === "live";
    return {
      ...base,
      ...meta,
      status,
      period: live ? (sb.period ?? null) : null,
      clock: live ? cleanGameClock(sb.clock) : null,
      situation: live ? (sb.situation ?? null) : null,
      tv: cleanTv(sb.tv),
      home: {
        ...base.home,
        points: sb.homeTeam.points ?? base.home.points,
        lineScores: sb.homeTeam.lineScores ?? base.home.lineScores,
      },
      away: {
        ...base.away,
        points: sb.awayTeam.points ?? base.away.points,
        lineScores: sb.awayTeam.lineScores ?? base.away.lineScores,
      },
    };
  }
  if (!g.completed && !base.startTbd) {
    const sinceKickoff = now.getTime() - Date.parse(g.startDate);
    if (sinceKickoff >= 0 && sinceKickoff < SIX_HOURS) {
      return { ...base, ...meta, status: "live" };
    }
  }
  return { ...base, ...meta };
}

const NEUTRAL = "#8b93a0";

/** An opponent outside /teams/fbs (FCS) still gets a page: name only, neutral accent. */
export function fallbackTeam(
  id: number,
  school: string,
  conference?: string | null,
): Team {
  return {
    id,
    school,
    mascot: "",
    abbreviation: school.slice(0, 4).toUpperCase(),
    conference: conference ?? "",
    color: NEUTRAL,
    altColor: NEUTRAL,
    alternateNames: [],
  };
}
