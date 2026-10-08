import type { Team } from "../cfbd/models";

/** Lowercase and strip diacritics so "jose" matches "José". */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Case- and accent-insensitive match on school, abbreviation and alternate names. */
export function teamMatches(team: Team, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return [team.school, team.abbreviation, ...team.alternateNames].some((n) =>
    normalizeText(n).includes(q),
  );
}
