import type { BoxScore } from "@/lib/cfbd/models";
import { buildLineCells } from "@/lib/boxscore/format";

/** Spread, result against it, total and moneylines. Renders nothing for a game with no line. */
export function LineStrip({ box }: { box: BoxScore }) {
  const cells = buildLineCells(box);
  if (!cells) return null;
  return (
    <section
      aria-label="Spread and result"
      className="border-border bg-border grid grid-cols-2 gap-px border md:h-14.5 md:grid-cols-5"
    >
      {cells.map((c) => (
        <div
          key={c.label}
          className="bg-surface flex flex-col justify-center gap-1.5 py-2.5 pl-4 md:py-0 [&:last-child:nth-child(odd)]:col-span-2 md:[&:last-child:nth-child(odd)]:col-span-1"
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
