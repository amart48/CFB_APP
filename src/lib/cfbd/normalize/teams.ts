import type { RawTeam } from "../schemas";
import type { Team } from "../models";

const FALLBACK_COLOR = "#6b7280";

export function normalizeTeams(raw: RawTeam[]): Team[] {
  return raw.map((t) => ({
    id: t.id,
    school: t.school,
    mascot: t.mascot ?? "",
    abbreviation: t.abbreviation ?? t.school.slice(0, 4).toUpperCase(),
    conference: t.conference ?? "Independent",
    color: t.color ?? FALLBACK_COLOR,
    altColor: t.alternateColor ?? t.color ?? FALLBACK_COLOR,
    alternateNames: t.alternateNames ?? [],
    ...(t.location?.name
      ? {
          venue: {
            name: t.location.name,
            city: t.location.city ?? "",
            state: t.location.state ?? "",
            capacity: t.location.capacity ?? null,
          },
        }
      : {}),
  }));
}

/** Conference list built from the data, never hardcoded. */
export function conferencesOf(teams: Team[]): string[] {
  return [...new Set(teams.map((t) => t.conference))].sort((a, b) =>
    a.localeCompare(b),
  );
}
