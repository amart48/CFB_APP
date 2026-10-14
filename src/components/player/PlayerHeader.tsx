import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PlayerProfile } from "@/lib/cfbd/loaders";
import { formatHeight } from "@/lib/cfbd/normalize";
import { logoUrl } from "@/lib/utils/logo";
import { SeasonPicker } from "./SeasonPicker";

export function BackLink() {
  return (
    <Link
      href="/players"
      className="text-table text-fg-muted hover:text-fg flex h-6 w-fit items-center gap-1.5"
    >
      <ArrowLeft size={14} aria-hidden />
      Player Stats
    </Link>
  );
}

export function PlayerHeader({ profile }: { profile: PlayerProfile }) {
  const { bio, team, teamName } = profile;
  const subtitle = [
    bio.jersey !== null ? `#${bio.jersey}` : null,
    bio.position,
    teamName,
    bio.classYear,
  ]
    .filter(Boolean)
    .join(" · ");
  const items: [string, string | null][] = [
    ["JERSEY", bio.jersey !== null ? `#${bio.jersey}` : null],
    ["POSITION", bio.position || null],
    ["CLASS", bio.classYear],
    ["HEIGHT", formatHeight(bio.heightInches)],
    ["WEIGHT", bio.weightLbs ? `${bio.weightLbs} lb` : null],
    ["HOMETOWN", bio.hometown],
  ];
  return (
    <>
      <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {team ? (
            <Image
              src={logoUrl(team.id, 96)}
              alt=""
              width={48}
              height={48}
              className="size-12"
            />
          ) : (
            <span
              aria-hidden
              className="border-border size-12 rounded-full border-2"
            />
          )}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-heading text-fg font-normal">{bio.name}</h1>
            <p className="text-body text-fg-muted">{subtitle}</p>
          </div>
        </div>
        <SeasonPicker seasons={profile.seasons} season={profile.season} />
      </div>
      <dl className="border-border bg-border grid grid-cols-2 gap-px border sm:grid-cols-3 md:h-15 md:grid-cols-6">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="bg-surface flex flex-col justify-center gap-1.5 py-2.5 pl-4 md:py-0"
          >
            <dt className="text-label text-fg-muted tracking-wide">{label}</dt>
            <dd className="text-body text-fg">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
