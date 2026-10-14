"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type RadarPoint = { axis: string; a: number | null; b: number | null };

type Props = {
  data: RadarPoint[];
  aName: string;
  bName: string;
  aColor: string;
  bColor: string;
};

const MUTED = "var(--color-fg-muted)";
const BORDER = "var(--color-border)";

/** National percentile (100 = best in FBS) on each axis; defense axes are already flipped. */
export function CompareRadar({ data, aName, bName, aColor, bColor }: Props) {
  return (
    <div
      className="h-96 w-full p-4"
      role="img"
      aria-label={`National percentile radar comparing ${aName} and ${bName}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="62%">
          <PolarGrid stroke={BORDER} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: MUTED, fontSize: 11 }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            name={aName}
            dataKey="a"
            stroke={aColor}
            fill={aColor}
            fillOpacity={0.25}
          />
          <Radar
            name={bName}
            dataKey="b"
            stroke={bColor}
            fill={bColor}
            fillOpacity={0.25}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-raised)",
              border: `1px solid ${BORDER}`,
              fontSize: 12,
            }}
            formatter={(v: unknown) =>
              typeof v === "number" ? `${v}th pct` : "—"
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
