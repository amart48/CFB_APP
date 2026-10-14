import { Panel } from "@/components/player/Panel";
import { StateBody } from "@/components/scoreboard/StateMessage";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamRows, type TeamsIndex } from "@/lib/cfbd/loaders";
import { buildComparison, RADAR_KEYS } from "@/lib/compare/compare";
import type { SortKey } from "@/lib/teams/columns";
import { rankTeam } from "@/lib/teams/rank";
import { pairColors } from "@/lib/utils/color";
import { CompareRadar, type RadarPoint } from "./CompareRadar";
import { CompareTable } from "./CompareTable";
import { TeamCards } from "./TeamCards";

/** Short axis names so the radar labels fit on a phone. */
const RADAR_LABELS: Partial<Record<SortKey, string>> = {
  offPpa: "Off PPA",
  offSuccess: "Off Succ.",
  offExplosive: "Off Expl.",
  offPpg: "Off Pts",
  defPpa: "Def PPA",
  defSuccess: "Def Succ.",
  defExplosive: "Def Expl.",
  defPpg: "Def Pts",
};

/** Loads season stats (the same cached calls as the Teams table), then draws both views. */
export async function CompareResults({
  index,
  a,
  b,
}: {
  index: TeamsIndex;
  a: number;
  b: number;
}) {
  const result = await attempt(() => loadTeamRows(index));
  if (!result.ok) {
    return (
      <StateBody
        variant="error"
        title="Couldn't load team stats"
        message={result.message}
      />
    );
  }
  const rows = result.data;
  const metrics = buildComparison(rows, a, b);
  const rowA = rows.find((r) => r.team.id === a);
  const rowB = rows.find((r) => r.team.id === b);
  const teamA = rowA?.team;
  const teamB = rowB?.team;
  if (!metrics || !rowA || !rowB || !teamA || !teamB) {
    return (
      <StateBody
        variant="empty"
        title="Team not found"
        message={`One of these teams has no FBS stats for ${index.season}. Pick another team or season.`}
      />
    );
  }

  const [aColor, bColor] = pairColors(teamA, teamB);
  const radar: RadarPoint[] = RADAR_KEYS.flatMap((key) => {
    const m = metrics.find((x) => x.key === key);
    return m
      ? [
          {
            axis: RADAR_LABELS[key] ?? m.label,
            a: m.a.percentile,
            b: m.b.percentile,
          },
        ]
      : [];
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="NATIONAL PERCENTILE" sub="100 = best in FBS">
          <CompareRadar
            data={radar}
            aName={teamA.school}
            bName={teamB.school}
            aColor={aColor}
            bColor={bColor}
          />
        </Panel>
        <TeamCards
          season={index.season === index.currentSeason ? null : index.season}
          a={{
            row: rowA,
            color: aColor,
            spRank: rankTeam(rows, a).spOverall?.rank ?? null,
          }}
          b={{
            row: rowB,
            color: bColor,
            spRank: rankTeam(rows, b).spOverall?.rank ?? null,
          }}
        />
      </div>
      <CompareTable
        metrics={metrics}
        aName={teamA.school}
        bName={teamB.school}
        aColor={aColor}
        bColor={bColor}
      />
    </div>
  );
}
