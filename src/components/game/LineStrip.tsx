import type { BoxScore } from "@/lib/cfbd/models";
import { buildLineCells } from "@/lib/boxscore/format";

/** Spread, result against it, total and moneylines. Renders nothing for a game with no line. */
export function LineStrip({ box }: { box: BoxScore }) {
  const cells = buildLineCells(box);
  if (!cells) return null;
  return (
    <section
      aria-label="Spread and result"
      className="border-border bg-surface grid h-14.5 grid-cols-5 border"
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`border-border flex flex-col justify-center gap-1.5 pl-4 ${i > 0 ? "border-l" : ""}`}
        >
          <span className="text-label tracking-caps text-fg-muted">
            {c.label}
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-body text-fg tabular-nums">{c.value}</span>
            {c.sub && <span className="text-table text-fg-muted">{c.sub}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}
