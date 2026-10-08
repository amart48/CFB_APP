import { Panel } from "@/components/player/Panel";

const bar = "h-2 rounded-[2px] bg-border";

function Bars({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={`${bar} w-full`} />
      ))}
    </div>
  );
}

/** Whole-page loading state (matches the Figma loading frame). */
export function GameSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading game"
      className="flex flex-col gap-5 motion-safe:animate-pulse"
    >
      <Panel title="GAME">
        <div className="border-border flex h-28 items-center justify-between border-b px-10">
          <div className="flex items-center gap-4">
            <span className="border-border size-12 rounded-full border-2" />
            <div className="flex flex-col gap-2">
              <span className={`${bar} w-30`} />
              <span className={`${bar} w-40`} />
            </div>
          </div>
          <div className="flex items-center gap-7">
            <span className="bg-border h-4 w-10 rounded-[2px]" />
            <span className={`${bar} w-15`} />
            <span className="bg-border h-4 w-10 rounded-[2px]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-2">
              <span className={`${bar} w-30`} />
              <span className={`${bar} w-40`} />
            </div>
            <span className="border-border size-12 rounded-full border-2" />
          </div>
        </div>
        <Bars rows={3} />
      </Panel>
      <div className="border-border bg-surface grid h-14.5 grid-cols-5 border">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`border-border flex flex-col justify-center gap-2 pl-4 ${i > 0 ? "border-l" : ""}`}
          >
            <span className={`${bar} w-20`} />
            <span className={`${bar} w-14`} />
          </div>
        ))}
      </div>
      <Panel title="TEAM STATS">
        <Bars rows={8} />
      </Panel>
      <Panel title="SCORING SUMMARY">
        <Bars rows={6} />
      </Panel>
      <div className="grid grid-cols-2 gap-5">
        <Panel title="AWAY TEAM · PLAYER STATS">
          <Bars rows={10} />
        </Panel>
        <Panel title="HOME TEAM · PLAYER STATS">
          <Bars rows={10} />
        </Panel>
      </div>
    </div>
  );
}
