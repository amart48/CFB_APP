# CFB Stats

A dense, dark, table-first college football stats app built on the [CollegeFootballData](https://collegefootballdata.com) API.

**Live demo:** https://cfb-app-roan.vercel.app/

## Features

- **Scoreboard**: one row per game with expandable inline team stat comparisons, spreads and over/under. Filter by season, week, conference, Top 25, or team search.
- **Team season stats**: sortable table of every FBS team (offense, defense, SP+, PPA).
- **Team pages**: schedule, rankings, roster, statistical leaders, PPA trend chart.
- **Player pages and search**: season stats, career, game log, usage and PPA.
- **Box scores**: scoring summary, team stats, and player panels per game.
- **Team comparison**: side-by-side stats with a radar chart.
- Responsive across desktop, tablet and mobile.

## Tech stack

Next.js · React · TypeScript · Tailwind CSS · TanStack Table · Recharts · Zod · Vitest + React Testing Library · Vercel

## Architecture

All API access goes through one typed module, `src/lib/cfbd/`. Pages are server components and no component calls the API directly.

```
src/
  app/                  routes (scoreboard, teams, players, games, compare)
  components/           UI grouped by feature (scoreboard, stats, team, player, game, compare)
  lib/cfbd/
    http.ts             fetch wrapper: auth, caching, rate-limit and error handling
    schemas.ts          Zod schemas that validate raw API responses
    normalize/          raw API shapes -> our own typed models
    models.ts           the only types the UI sees
    config.ts           cache windows
```

Key decisions:

- **Validate at the boundary.** Raw responses are parsed with Zod, then normalized into our own models. The UI never touches API shapes, so API quirks stay in one place.
- **Join on IDs, not names.** The API returns team identifiers under several different field names across endpoints (and only name strings in one), so the normalizers map everything onto numeric team and game IDs.
- **Respect a monthly call quota.** The API allows 30,000 calls per month. Requests are batched by week rather than per team or per row, deduplicated within a render, and cached with explicit `revalidate` windows: effectively permanent for past seasons, 24 hours for current-season stats, 10 minutes for the live week.
- **Server-only API key.** The key is read on the server and never reaches the browser.
- **URL as state.** Filters live in search params, so every view is shareable and server-rendered. There is no global state library.
- **Graceful failure.** API errors and rate limits surface as clear error states rather than crashes.

```bash
npm test
```

## Getting started

Requires Node.js (current LTS) and a free [CFBD API key](https://collegefootballdata.com/key).

```bash
npm install
cp .env.example .env.local   # then set CFBD_API_KEY
npm run dev
```

Open http://localhost:3000.

| Script              | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the dev server                      |
| `npm run build`     | Production build                          |
| `npm test`          | Run the test suite                        |
| `npm run typecheck` | TypeScript check                          |
| `npm run lint`      | ESLint                                    |
| `npm run fixtures`  | Re-record API fixtures (needs an API key) |

## Deployment

Deployed on Vercel. Set `CFBD_API_KEY` in the project's environment variables (Production and Preview). Do not prefix it with `NEXT_PUBLIC_`.

## Data

Data from [CollegeFootballData.com](https://collegefootballdata.com). This project is not affiliated with the NCAA or any university.
