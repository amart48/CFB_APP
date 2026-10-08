/** "José Ruiz Jr." to "jose-ruiz-jr". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Player page path segment: id first so the page can find the player even if the name changes. */
export function playerSlug(id: string, name: string): string {
  const slug = slugify(name);
  return slug ? `${id}-${slug}` : id;
}

/** "4870906-arch-manning" to the id and a searchable name ("arch manning"). */
export function parsePlayerSlug(
  slug: string,
): { id: string; name: string } | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null; // a malformed link must not crash the page
  }
  const m = /^(\d+)(?:-(.*))?$/.exec(decoded);
  if (!m) return null;
  return { id: m[1], name: (m[2] ?? "").replace(/-/g, " ").trim() };
}

/** Link to a player's page, carrying the team (the stats endpoints are team-scoped). */
export function playerHref(
  row: { playerId: string; name: string; team: { school: string } },
  season: number | null,
): string {
  const sp = new URLSearchParams({ team: row.team.school });
  if (season !== null) sp.set("season", String(season));
  return `/players/${playerSlug(row.playerId, row.name)}?${sp.toString()}`;
}

/** Team page path segment, id first: "251-texas". */
export const teamSlug = (id: number, school: string) =>
  playerSlug(String(id), school);

/** Link to a team's page, optionally for a past season. */
export function teamHref(
  team: { id: number; school: string },
  season: number | null = null,
): string {
  const base = `/teams/${teamSlug(team.id, team.school)}`;
  return season === null ? base : `${base}?season=${season}`;
}

/** Game page path segment, id first: "401862786-north-texas-at-tulsa". */
export const gameSlug = (id: number, away: string, home: string) =>
  playerSlug(String(id), `${away} at ${home}`);

/** Link to a game's box score. */
export const gameHref = (
  id: number,
  away: { school: string },
  home: { school: string },
) => `/games/${gameSlug(id, away.school, home.school)}`;
