import Link from "next/link";
import { Panel } from "@/components/player/Panel";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import { playerHref } from "@/lib/utils/slug";

export function LeadersPanel({ profile }: { profile: TeamProfile }) {
  const { leaders, team, season } = profile;
  return (
    <Panel title="TEAM LEADERS" sub="Season totals">
      {leaders.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          No player stats yet.
        </p>
      ) : (
        <div className="bg-border grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6">
          {leaders.map((l) => (
            <div
              key={l.key}
              className="bg-surface flex min-w-0 flex-col gap-1.5 p-4"
            >
              <h3 className="text-label text-fg-muted tracking-wide">
                {l.label}
              </h3>
              <p className="flex items-end gap-1.5">
                <span className="text-supporting text-fg-winner tabular-nums">
                  {Number.isInteger(l.value)
                    ? l.value.toLocaleString("en-US")
                    : l.value.toFixed(1)}
                </span>
                <span className="text-label text-fg-muted pb-0.5">
                  {l.unit}
                </span>
              </p>
              <Link
                href={playerHref(
                  { playerId: l.playerId, name: l.name, team },
                  season,
                )}
                className="text-body text-fg hover:text-action truncate hover:underline"
              >
                {l.name} · {l.position}
              </Link>
              <p className="text-label text-fg-muted">{l.detail}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
