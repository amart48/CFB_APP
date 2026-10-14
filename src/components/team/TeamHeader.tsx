import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SeasonPicker } from "@/components/player/SeasonPicker";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import { logoUrl } from "@/lib/utils/logo";

export function BackLink() {
  return (
    <Link
      href="/teams"
      className="text-table text-fg-muted hover:text-fg flex h-6 w-fit items-center gap-1.5"
    >
      <ArrowLeft size={14} aria-hidden />
      Team Stats
    </Link>
  );
}

export function TeamHeader({ profile }: { profile: TeamProfile }) {
  const { team, coach, index, season } = profile;
  const venue = team.venue
    ? [
        team.venue.name,
        [team.venue.city, team.venue.state].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const subtitle = [
    team.conference,
    coach ? `Head coach ${coach}` : null,
    venue,
  ]
    .filter(Boolean)
    .join(" · ");
  // oldest first, to match SeasonPicker's expectations
  const seasons = Array.from(
    { length: index.currentSeason - 2015 + 1 },
    (_, i) => 2015 + i,
  );
  return (
    <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Image
          src={logoUrl(team.id, 96)}
          alt=""
          width={48}
          height={48}
          className="size-12"
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-end gap-x-2.5">
            <h1 className="text-heading text-fg font-normal">{team.school}</h1>
            {team.mascot && (
              <span className="text-body text-fg-muted pb-1">
                {team.mascot}
              </span>
            )}
          </div>
          <p className="text-body text-fg-muted">{subtitle}</p>
        </div>
      </div>
      <SeasonPicker seasons={seasons} season={season} />
    </div>
  );
}
