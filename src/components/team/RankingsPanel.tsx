import { Panel } from "@/components/player/Panel";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamRows, type TeamProfile } from "@/lib/cfbd/loaders";
import { COLUMN_BY_KEY, type SortKey } from "@/lib/teams/columns";
import { rankTeam } from "@/lib/teams/rank";
import { readableOnDark } from "@/lib/utils/color";

type Metric = { key: SortKey; label: string };

const GROUPS: { label: string; metrics: Metric[] }[] = [
  {
    label: "SP+ RATINGS",
    metrics: [
      { key: "spOverall", label: "Overall" },
      { key: "spOffense", label: "Offense" },
      { key: "spDefense", label: "Defense" },
    ],
  },
  {
    label: "OFFENSE",
    metrics: [
      { key: "offPpa", label: "PPA/Play" },
      { key: "offSuccess", label: "Success rate" },
      { key: "offExplosive", label: "Explosiveness" },
      { key: "offYpp", label: "Yards/Play" },
      { key: "offPpg", label: "Points/Game" },
    ],
  },
  {
    label: "DEFENSE",
    metrics: [
      { key: "defPpa", label: "PPA/Play" },
      { key: "defSuccess", label: "Success rate" },
      { key: "defExplosive", label: "Explosiveness" },
      { key: "defYpp", label: "Yards/Play" },
      { key: "defPpg", label: "Points/Game" },
    ],
  },
];

/** Values and national ranks for the team on every table column (from the cached 138-team data). */
export async function RankingsPanel({ profile }: { profile: TeamProfile }) {
  const result = await attempt(() => loadTeamRows(profile.index));
  const rows = result.ok ? result.data : [];
  const row = rows.find((r) => r.team.id === profile.team.id);
  const ranks = rankTeam(rows, profile.team.id);
  const color = readableOnDark(profile.team.color, profile.team.altColor);

  return (
    <Panel
      title="TEAM RANKINGS"
      sub={rows.length ? `Among ${rows.length} FBS teams` : undefined}
    >
      {!result.ok || !row ? (
        <p
          className="text-table text-fg-muted px-4 py-6"
          role={result.ok ? undefined : "alert"}
        >
          {result.ok ? "No ratings for this team yet." : result.message}
        </p>
      ) : (
        GROUPS.map((g) => (
          <div key={g.label}>
            <h3 className="text-label text-fg-muted flex h-6.5 items-center px-4 tracking-wide">
              {g.label}
            </h3>
            {g.metrics.map((m) => {
              const col = COLUMN_BY_KEY.get(m.key)!;
              const rank = ranks[m.key];
              const percentile =
                rank && rank.of > 1
                  ? (rank.of - rank.rank) / (rank.of - 1)
                  : null;
              return (
                <div
                  key={m.key}
                  className="border-border flex h-7 items-center border-b px-4 last:border-b-0"
                >
                  <span className="text-table text-fg w-32 shrink-0 sm:w-45">
                    {m.label}
                  </span>
                  <span className="text-table text-fg-winner w-14 shrink-0 text-right tabular-nums sm:w-20">
                    {col.format(row)}
                  </span>
                  <span className="text-table text-action w-12 shrink-0 text-right tabular-nums sm:w-16">
                    {rank ? `#${rank.rank}` : "—"}
                  </span>
                  <div className="flex-1 pl-4" aria-hidden>
                    <div className="bg-border h-1 rounded-[1px]">
                      <div
                        className="h-1 rounded-[1px]"
                        style={{
                          width: `${Math.max(1, (percentile ?? 0) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </Panel>
  );
}
