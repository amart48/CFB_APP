"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PpaChartPoint = {
  week: number;
  label: string;
  opponent: string;
  offense: number | null;
  defense: number | null;
};

type Props = { data: PpaChartPoint[]; offenseColor: string };

const MUTED = "var(--color-fg-muted)";
const BORDER = "var(--color-border)";
const fmt = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : "—");

/** Offense and defense PPA per play for each game. Recharts, themed with the Tailwind tokens. */
export function PpaChart({ data, offenseColor }: Props) {
  return (
    <div
      className="h-72 w-full p-4"
      role="img"
      aria-label="Offense and defense PPA per play by game"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
          barGap={4}
        >
          <CartesianGrid stroke={BORDER} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={{ stroke: MUTED }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <ReferenceLine y={0} stroke={MUTED} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-fg)" }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as PpaChartPoint | undefined;
              return p ? `Week ${p.week} · ${p.opponent}` : "";
            }}
            formatter={(v) => fmt(v)}
          />
          <Legend
            itemSorter={null}
            verticalAlign="top"
            align="left"
            iconType="square"
            iconSize={10}
            wrapperStyle={{
              fontSize: 11,
              color: MUTED,
              paddingBottom: 8,
              paddingLeft: 24,
            }}
          />
          <Bar
            dataKey="offense"
            name="Offense (higher is better)"
            fill={offenseColor}
            radius={1}
            maxBarSize={14}
            isAnimationActive={false}
          />
          <Bar
            dataKey="defense"
            name="Defense (lower is better)"
            fill={MUTED}
            radius={1}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
