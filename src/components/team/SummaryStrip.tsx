import { Suspense } from "react";
import { attempt } from "@/lib/cfbd/attempt";
import { loadApRank, loadTeamRows, type TeamProfile } from "@/lib/cfbd/loaders";
import { formatSplit } from "@/lib/cfbd/normalize";
import { rankTeam } from "@/lib/teams/rank";

const Pending = () => (
  <span aria-hidden className="bg-border block h-2 w-12 rounded-[2px]" />
);

export async function ApRank({ profile }: { profile: TeamProfile }) {
  const r = await attempt(() => loadApRank(profile.index, profile.team.id));
  return <>{r.ok && r.data !== null ? r.data : "—"}</>;
}

export async function SpRating({ profile }: { profile: TeamProfile }) {
  const r = await attempt(() => loadTeamRows(profile.index));
  if (!r.ok) return <>—</>;
  const row = r.data.find((x) => x.team.id === profile.team.id);
  const rank = rankTeam(r.data, profile.team.id).spOverall;
  if (row?.spOverall == null) return <>—</>;
  return (
    <>
      {row.spOverall.toFixed(1)}
      {rank ? ` · #${rank.rank}` : ""}
    </>
  );
}

/** Record splits come with the page; AP rank and SP+ stream in (they need other cached data). */
export function SummaryStrip({ profile }: { profile: TeamProfile }) {
  const { record } = profile;
  const items: [string, React.ReactNode][] = [
    ["RECORD", formatSplit(record.overall)],
    ["CONFERENCE", formatSplit(record.conference)],
    ["HOME", formatSplit(record.home)],
    ["AWAY", formatSplit(record.away)],
    [
      "AP RANK",
      <Suspense key="ap" fallback={<Pending />}>
        <ApRank profile={profile} />
      </Suspense>,
    ],
    [
      "SP+",
      <Suspense key="sp" fallback={<Pending />}>
        <SpRating profile={profile} />
      </Suspense>,
    ],
    [
      "EXPECTED WINS",
      record.expectedWins === null ? "—" : record.expectedWins.toFixed(1),
    ],
  ];
  return (
    <dl className="border-border bg-surface grid h-15 grid-cols-7 border">
      {items.map(([label, value], i) => (
        <div
          key={label}
          className={`flex flex-col justify-center gap-1.5 pl-4 ${i > 0 ? "border-border border-l" : ""}`}
        >
          <dt className="text-label text-fg-muted tracking-wide">{label}</dt>
          <dd className="text-body text-fg tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
