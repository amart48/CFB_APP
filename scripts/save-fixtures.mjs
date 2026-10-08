// One-time script: saves trimmed raw CFBD responses to fixtures/ so tests never spend API calls.
// Usage: npm run fixtures   (reads CFBD_API_KEY from .env.local)
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://api.collegefootballdata.com";
const YEAR = 2026;
const WEEK = 5; // a completed week, for past-week endpoints
const KEEP_GAMES = 3;

let remaining = null;
async function get(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params))
    url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}` },
  });
  remaining = res.headers.get("x-calllimit-remaining") ?? remaining;
  if (!res.ok)
    throw new Error(`${res.status} ${url.pathname}: ${await res.text()}`);
  return res.json();
}

async function save(name, data) {
  await mkdir("fixtures", { recursive: true });
  await writeFile(
    `fixtures/${name}.json`,
    JSON.stringify(data, null, 2) + "\n",
  );
  console.log(`saved fixtures/${name}.json`);
}

const group = process.argv[2] ?? "week";
const wk = { year: YEAR, week: WEEK, seasonType: "regular" };

if (group === "team") {
  // Team page: Texas, current season.
  const team = "Texas";
  await save("team-games", await get("/games", { year: YEAR, team }));
  await save("team-record", await get("/records", { year: YEAR, team }));
  await save("coaches", await get("/coaches", { team, year: YEAR }));
  await save("ppa-team-games", await get("/ppa/games", { year: YEAR, team }));
  await save("roster-team", await get("/roster", { team, year: YEAR }));
  await save(
    "team-player-stats",
    await get("/stats/player/season", { year: YEAR, team }),
  );
  console.log(`calls remaining this month: ${remaining}`);
  process.exit(0);
}

if (group === "player") {
  // Individual player page: one player (and one teammate) on Texas.
  const ID = "4870906";
  const team = "Texas";
  const roster = await get("/roster", { team, year: YEAR });
  const other =
    roster.find((p) => p.id !== ID && p.position === "RB") ??
    roster.find((p) => p.id !== ID);
  const ids = new Set([ID, other.id]);
  await save(
    "roster",
    roster.filter((p) => ids.has(p.id)),
  );
  await save(
    "player-search",
    await get("/player/search", { searchTerm: "Arch Manning" }),
  );
  await save(
    "ppa-player-season",
    await get("/ppa/players/season", { year: YEAR, playerId: ID }),
  );
  await save(
    "player-usage",
    await get("/player/usage", { year: YEAR, playerId: ID }),
  );
  await save(
    "ppa-player-games",
    await get("/ppa/players/games", { year: YEAR, team, playerId: ID }),
  );
  const stats = await get("/stats/player/season", { year: YEAR, team });
  await save(
    "player-team-stats",
    stats.filter((r) => ids.has(r.playerId)),
  );
  const prev = await get("/stats/player/season", { year: YEAR - 1, team });
  await save(
    "player-team-stats-prev",
    prev.filter((r) => r.playerId === ID),
  );
  console.log(`calls remaining this month: ${remaining}`);
  process.exit(0);
}

if (group === "players") {
  // Player leaderboards: one slice per category for one conference, trimmed to two teams.
  const categories = [
    "passing",
    "rushing",
    "receiving",
    "defensive",
    "interceptions",
    "kicking",
    "punting",
    "kickReturns",
    "puntReturns",
  ];
  const keep = new Set(["Texas", "Georgia"]);
  const rows = [];
  for (const category of categories) {
    const slice = await get("/stats/player/season", {
      year: YEAR,
      conference: "SEC",
      category,
    });
    rows.push(...slice.filter((r) => keep.has(r.team)));
  }
  await save("player-stats-season", rows);
  console.log(`calls remaining this month: ${remaining}`);
  process.exit(0);
}

if (group === "game") {
  // Game box score: one final game (North Texas at Tulsa, week 5) and one upcoming game, using
  // the same slice calls the page makes (week + home team; /games/teams etc. reject a bare gameId).
  const FINAL = 401862786;
  const UPCOMING = process.argv[3] ?? "401871051";
  const finalGame = (await get("/games", { id: FINAL }))[0];
  const upcoming = (await get("/games", { id: UPCOMING }))[0];
  await save("game-games", [finalGame, upcoming]);
  const slice = {
    year: finalGame.season,
    week: finalGame.week,
    seasonType: finalGame.seasonType,
    team: finalGame.homeTeam,
  };
  await save("game-lines", [
    ...(await get("/lines", { gameId: FINAL, year: finalGame.season })),
    ...(await get("/lines", { gameId: UPCOMING, year: upcoming.season })),
  ]);
  await save("game-teams", await get("/games/teams", slice));
  await save("game-players", await get("/games/players", slice));
  await save("game-drives", await get("/drives", slice));
  await save("game-advanced", await get("/stats/game/advanced", slice));
  console.log(`calls remaining this month: ${remaining}`);
  process.exit(0);
}

if (group === "live") {
  // Run DURING a game: saves the live /scoreboard entry and that game's slice responses so the
  // live status string and partial-data shapes can be verified.
  const scoreboard = await get("/scoreboard", { classification: "fbs" });
  const live = scoreboard.filter(
    (g) => g.status !== "scheduled" && g.status !== "completed",
  );
  if (live.length === 0) {
    console.log(
      "No live game right now (every game is scheduled or completed).",
    );
    process.exit(0);
  }
  const g = live[0];
  await save("live-scoreboard", live.slice(0, 2));
  const game = (await get("/games", { id: g.id }))[0];
  const slice = {
    year: game.season,
    week: game.week,
    seasonType: game.seasonType,
    team: game.homeTeam,
  };
  await save("live-games", [game]);
  await save("live-games-teams", await get("/games/teams", slice));
  await save("live-games-players", await get("/games/players", slice));
  await save("live-drives", await get("/drives", slice));
  await save("live-advanced", await get("/stats/game/advanced", slice));
  console.log(`saved live game ${g.id} (status "${g.status}")`);
  console.log(`calls remaining this month: ${remaining}`);
  process.exit(0);
}

if (group === "team-stats") {
  // Team Season Stats table: SP+, advanced season stats, season stats, records, games.
  const { readFile } = await import("node:fs/promises");
  const fixtureTeams = JSON.parse(
    await readFile("fixtures/teams-fbs.json", "utf8"),
  );
  const names = new Set(fixtureTeams.map((t) => t.school));
  const ids = new Set(fixtureTeams.map((t) => t.id));

  const sp = await get("/ratings/sp", { year: YEAR });
  // keep the stray "nationalAverages" row so tests cover dropping it
  await save(
    "ratings-sp",
    sp.filter((r) => names.has(r.team) || !r.conference),
  );
  await save(
    "stats-season-advanced",
    (await get("/stats/season/advanced", { year: YEAR })).filter((r) =>
      names.has(r.team),
    ),
  );
  await save(
    "stats-season",
    (await get("/stats/season", { year: YEAR })).filter((r) =>
      names.has(r.team),
    ),
  );
  await save(
    "records",
    (await get("/records", { year: YEAR })).filter((r) => ids.has(r.teamId)),
  );
  const seasonGames = await get("/games", {
    year: YEAR,
    seasonType: "regular",
    classification: "fbs",
  });
  await save(
    "games-season",
    seasonGames.filter((g) => ids.has(g.homeId) || ids.has(g.awayId)),
  );
  console.log(`calls remaining this month: ${remaining}`);
  process.exit(0);
}

const games = await get("/games", { ...wk, classification: "fbs" });
const completed = games.filter((g) => g.completed);
const pick = completed.slice(0, KEEP_GAMES);
const ids = new Set(pick.map((g) => g.id));
const teamIds = new Set(pick.flatMap((g) => [g.homeId, g.awayId]));
await save("games", pick);

const lines = await get("/lines", wk);
await save(
  "lines",
  lines.filter((l) => ids.has(l.id)),
);

const gameTeams = await get("/games/teams", wk);
await save(
  "games-teams",
  gameTeams.filter((g) => ids.has(g.id)),
);

const adv = await get("/stats/game/advanced", wk);
await save(
  "stats-game-advanced",
  adv.filter((g) => ids.has(g.gameId)),
);

await save("rankings", await get("/rankings", wk));

const teams = await get("/teams/fbs", { year: YEAR });
const scoreboard = await get("/scoreboard", { classification: "fbs" });
const sbPick = [
  ...scoreboard.filter((g) => g.status === "completed").slice(0, 1),
  ...scoreboard.filter((g) => g.status !== "completed").slice(0, 2),
];
for (const g of sbPick) {
  teamIds.add(g.homeTeam.id);
  teamIds.add(g.awayTeam.id);
}
await save("scoreboard", sbPick);
await save(
  "teams-fbs",
  teams.filter((t) => teamIds.has(t.id)),
);
await save("calendar", await get("/calendar", { year: YEAR }));

console.log(`calls remaining this month: ${remaining}`);
