import { Panel } from "@/components/player/Panel";
import type { TeamProfile } from "@/lib/cfbd/loaders";
import { readableOnDark } from "@/lib/utils/color";
import { PpaChart, type PpaChartPoint } from "./PpaChart";

export function PpaChartPanel({ profile }: { profile: TeamProfile }) {
  const abbreviation = new Map(
    profile.index.teams.map((t) => [t.school, t.abbreviation]),
  );
  const data: PpaChartPoint[] = profile.ppaGames.map((g) => ({
    week: g.week,
    label: `${g.week} · ${abbreviation.get(g.opponent) ?? g.opponent.slice(0, 4).toUpperCase()}`,
    opponent: g.opponent,
    offense: g.offense,
    defense: g.defense,
  }));
  return (
    <Panel title="PPA PER PLAY BY GAME" sub="Offense vs defense">
      {data.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          No games played yet.
        </p>
      ) : (
        <PpaChart
          viewKey={`ppa:${profile.team.id}`}
          data={data}
          offenseColor={readableOnDark(
            profile.team.color,
            profile.team.altColor,
          )}
        />
      )}
    </Panel>
  );
}
