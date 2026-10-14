import type { SituationSplits } from "@/lib/cfbd/models";
import { ppa, pct } from "./format";
import { Panel } from "./Panel";

type Props = {
  usage: SituationSplits | null;
  ppa: SituationSplits | null;
  color: string;
};

const METRICS: [string, keyof SituationSplits][] = [
  ["OVERALL", "all"],
  ["PASS", "pass"],
  ["RUSH", "rush"],
  ["1ST DOWN", "firstDown"],
  ["2ND DOWN", "secondDown"],
  ["3RD DOWN", "thirdDown"],
];
// In the PPA group the first metric is the all-plays average, labelled "ALL".
const PPA_METRICS = METRICS.map(
  ([l, k]) => [l === "OVERALL" ? "ALL" : l, k] as const,
);

function Group({
  label,
  splits,
  format,
  bars,
  color,
  metrics,
}: {
  label: string;
  splits: SituationSplits | null;
  format: (n: number | null) => string;
  bars: boolean;
  color: string;
  metrics: readonly (readonly [string, keyof SituationSplits])[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <h3 className="text-label text-fg-muted tracking-wide">{label}</h3>
      {splits ? (
        <dl className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {metrics.map(([name, key]) => {
            const v = splits[key];
            return (
              <div key={name} className="flex flex-col gap-1.5">
                <dt className="text-label text-fg-muted">{name}</dt>
                <dd className="text-supporting text-fg tabular-nums">
                  {format(v)}
                </dd>
                {bars && (
                  <div className="bg-border h-1 rounded-[1px]" aria-hidden>
                    <div
                      className="h-1 rounded-[1px]"
                      style={{
                        width: `${Math.min(100, Math.max(0, (v ?? 0) * 100))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="text-table text-fg-muted">
          Not enough plays this season.
        </p>
      )}
    </div>
  );
}

export function UsagePpaPanel({ usage, ppa: ppaSplits, color }: Props) {
  return (
    <Panel title="USAGE & PPA" sub="Share of team plays · Average PPA per play">
      <div className="flex">
        <Group
          label="USAGE"
          splits={usage}
          format={pct}
          bars
          color={color}
          metrics={METRICS}
        />
        <div aria-hidden className="bg-border w-px" />
        <Group
          label="AVERAGE PPA"
          splits={ppaSplits}
          format={ppa}
          bars={false}
          color={color}
          metrics={PPA_METRICS}
        />
      </div>
    </Panel>
  );
}
