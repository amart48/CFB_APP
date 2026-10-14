import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/player/Panel";
import type { TeamSeasonRow } from "@/lib/cfbd/models";
import { formatRecord } from "@/lib/teams/columns";
import { teamHref } from "@/lib/utils/slug";
import { logoUrl } from "@/lib/utils/logo";

export type CardTeam = {
  row: TeamSeasonRow;
  color: string;
  spRank: number | null;
};

function Card({ row, color, spRank }: CardTeam, season: number | null) {
  const { team } = row;
  const stats: [string, string][] = [
    ["RECORD", formatRecord(row.record)],
    ["SP+", row.spOverall === null ? "—" : row.spOverall.toFixed(1)],
    ["SP+ RANK", spRank === null ? "—" : `#${spRank}`],
  ];
  return (
    <div className="border-border flex flex-col gap-3 border-b p-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-9 w-0.5 shrink-0"
          style={{ background: color }}
        />
        <Image
          src={logoUrl(team.id, 48)}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0"
        />
        <div className="flex min-w-0 flex-col">
          <Link
            href={teamHref(team, season)}
            className="text-title text-fg hover:text-action truncate font-semibold"
          >
            {team.school}
          </Link>
          <span className="text-table text-fg-muted truncate">
            {team.conference || "Independent"}
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-label text-fg-muted">{label}</dt>
            <dd className="text-body text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Logo, conference, record and SP+ for both teams, each linking to its team page. */
export function TeamCards({
  a,
  b,
  season,
}: {
  a: CardTeam;
  b: CardTeam;
  /** null = current season, so the team link has no season param. */
  season: number | null;
}) {
  return (
    <Panel title="TEAMS">
      {Card(a, season)}
      {Card(b, season)}
    </Panel>
  );
}
