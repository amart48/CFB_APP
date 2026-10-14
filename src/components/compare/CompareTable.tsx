import { Panel } from "@/components/player/Panel";
import { tallyEdge, type CompareMetric } from "@/lib/compare/compare";

type Props = {
  metrics: CompareMetric[];
  aName: string;
  bName: string;
  aColor: string;
  bColor: string;
};

const GROUPS: { group: CompareMetric["group"]; title: string }[] = [
  { group: "sp", title: "SP+ RATINGS" },
  { group: "off", title: "OFFENSE" },
  { group: "def", title: "DEFENSE" },
];

function Cell({
  text,
  win,
  align,
}: {
  text: string;
  win: boolean;
  align: "left" | "right";
}) {
  return (
    <span
      className={`text-table tabular-nums ${align === "right" ? "text-right" : "text-left"} ${
        win ? "text-fg font-semibold" : "text-fg-muted"
      }`}
    >
      {text}
    </span>
  );
}

function EdgeLine({
  metrics,
  aName,
  bName,
}: Pick<Props, "metrics" | "aName" | "bName">) {
  const { a, b, decided } = tallyEdge(metrics);
  if (decided === 0) return null;
  const text =
    a === b
      ? `${aName} and ${bName} split the ${decided} decided stats ${a}-${b}`
      : `${a > b ? aName : bName} leads on ${Math.max(a, b)} of ${decided} stats`;
  return (
    <p className="border-border text-table text-fg border-b px-4 py-2">
      {text}
    </p>
  );
}

/** One row per metric: team A value, the metric, team B value. The better side is bold. */
export function CompareTable({ metrics, aName, bName, aColor, bColor }: Props) {
  return (
    <Panel
      title="HEAD TO HEAD"
      sub="Bold = better; lower is better for defense"
    >
      <EdgeLine metrics={metrics} aName={aName} bName={bName} />
      <div
        className="border-border text-label grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-3 border-b px-4 py-2 font-semibold"
        aria-hidden
      >
        <span className="truncate text-right" style={{ color: aColor }}>
          {aName}
        </span>
        <span />
        <span className="truncate" style={{ color: bColor }}>
          {bName}
        </span>
      </div>
      {GROUPS.map(({ group, title }) => (
        <div key={group}>
          <p className="text-label text-fg-muted bg-surface-raised px-4 py-1">
            {title}
          </p>
          {metrics
            .filter((m) => m.group === group)
            .map((m) => (
              <div
                key={m.key}
                className="border-border grid h-8 grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-3 border-b px-4 last:border-b-0"
              >
                <Cell text={m.a.text} win={m.winner === "a"} align="right" />
                <span className="text-table text-fg-muted truncate text-center">
                  {m.label}
                </span>
                <Cell text={m.b.text} win={m.winner === "b"} align="left" />
              </div>
            ))}
        </div>
      ))}
    </Panel>
  );
}
