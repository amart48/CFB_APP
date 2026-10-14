/**
 * Game table columns from md up: status | away team | score | home team | score | spread/result | network | expand.
 * Narrower columns between md and xl so the table fits without sideways scrolling.
 * The `grid` display itself is set by the row, since below md the row is a stacked card.
 */
export const GAME_GRID =
  "md:grid-cols-[72px_minmax(0,1fr)_48px_minmax(0,1fr)_48px_180px_72px_40px] xl:grid-cols-[80px_minmax(0,1fr)_64px_minmax(0,1fr)_64px_240px_160px_40px] md:items-center";

/**
 * Below md each game is a card on the same grid: status and network on top,
 * a team per line with its score, the expand button beside the scores, spread underneath.
 * Every cell goes back to automatic placement at md.
 */
export const CARD_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_2.5rem] gap-y-1 md:gap-y-0";

const AUTO = "md:col-auto md:col-span-1 md:row-auto md:row-span-1";
export const CARD_CELL = {
  status: `col-start-1 row-start-1 ${AUTO}`,
  network: `col-span-2 col-start-2 row-start-1 justify-self-end ${AUTO} md:justify-self-auto`,
  awayTeam: `col-start-1 row-start-2 ${AUTO}`,
  awayScore: `col-start-2 row-start-2 ${AUTO}`,
  homeTeam: `col-start-1 row-start-3 ${AUTO}`,
  homeScore: `col-start-2 row-start-3 ${AUTO}`,
  spread: `col-span-3 col-start-1 row-start-4 ${AUTO}`,
  expand: `col-start-3 row-span-2 row-start-2 ${AUTO}`,
} as const;
