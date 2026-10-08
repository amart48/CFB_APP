import { Suspense } from "react";
import { attempt } from "@/lib/cfbd/attempt";
import { loadPlayerRows, type PlayerProfile } from "@/lib/cfbd/loaders";
import type { PlayerCategoryStats } from "@/lib/cfbd/normalize";
import {
  CATEGORY_BY_ID,
  formatStat,
  type PlayerCategory,
} from "@/lib/players/categories";
import { rankPlayer } from "@/lib/players/rank";
import { Panel } from "./Panel";

type Props = { profile: PlayerProfile };

const gridFor = (n: number) => ({
  gridTemplateColumns: `200px repeat(${n}, minmax(0, 1fr))`,
});
const cell = "pr-2 text-right tabular-nums";

/** Ranks among qualified FBS players. Streams in after the stats, since it needs the leaderboard. */
export async function RankRow({
  category,
  profile,
}: {
  category: PlayerCategory;
  profile: PlayerProfile;
}) {
  const result = await attempt(() =>
    loadPlayerRows(
      {
        season: profile.season,
        isPast: profile.season < profile.currentSeason,
      },
      category,
    ),
  );
  const ranks =
    result.ok && profile.team
      ? rankPlayer(result.data, category, profile.bio.id, profile.team.id)
      : null;
  return (
    <div
      className="grid h-6.5 items-center px-4"
      style={gridFor(category.columns.length)}
    >
      <span className="text-label text-fg-muted">Rank</span>
      {category.columns.map((c) => {
        const r = ranks?.[c.stat];
        return (
          <span
            key={c.stat}
            className={`${cell} text-label ${r ? "text-action" : "text-fg-muted"}`}
            title={
              r
                ? `${r.rank} of ${r.of} qualified players`
                : "Not enough volume to rank"
            }
          >
            {r ? `#${r.rank}` : "—"}
          </span>
        );
      })}
    </div>
  );
}

function RankSkeleton({ n }: { n: number }) {
  return (
    <div
      className="grid h-6.5 items-center px-4"
      style={gridFor(n)}
      aria-hidden
    >
      <span className="text-label text-fg-muted">Rank</span>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="bg-border mr-2 ml-auto h-2 w-6 rounded-[2px]"
        />
      ))}
    </div>
  );
}

function Block({
  stats,
  profile,
  withRank,
}: {
  stats: PlayerCategoryStats;
  profile: PlayerProfile;
  withRank: boolean;
}) {
  const category = CATEGORY_BY_ID.get(stats.category)!;
  const n = category.columns.length;
  return (
    <div className="border-border border-b last:border-b-0">
      <div className="grid h-7.5 items-center px-4" style={gridFor(n)}>
        <h3 className="text-body text-fg font-semibold">
          {category.label.toUpperCase()}
        </h3>
        {category.columns.map((c) => (
          <span
            key={c.stat}
            className={`${cell} text-label tracking-label ${c.stat === category.defaultSort ? "text-fg" : "text-fg-muted"}`}
          >
            {c.label}
          </span>
        ))}
      </div>
      <div className="grid h-7.5 items-center px-4" style={gridFor(n)}>
        <span className="text-table text-fg-muted">
          {profile.season} · {profile.teamName}
        </span>
        {category.columns.map((c) => (
          <span
            key={c.stat}
            className={`${cell} text-supporting text-fg-winner`}
          >
            {formatStat(stats.stats[c.stat], c.format)}
          </span>
        ))}
      </div>
      {withRank && (
        <Suspense fallback={<RankSkeleton n={n} />}>
          <RankRow category={category} profile={profile} />
        </Suspense>
      )}
    </div>
  );
}

export function SeasonStatsPanel({ profile }: Props) {
  return (
    <Panel
      title={`SEASON STATS · ${profile.season}`}
      sub={
        profile.season === profile.currentSeason
          ? "Rank among qualified FBS players"
          : undefined
      }
    >
      {profile.categories.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          No recorded stats for {profile.season}.
        </p>
      ) : (
        profile.categories.map((c) => (
          <Block
            key={c.category}
            stats={c}
            profile={profile}
            withRank={
              c.category === profile.primary &&
              profile.season === profile.currentSeason
            }
          />
        ))
      )}
    </Panel>
  );
}
