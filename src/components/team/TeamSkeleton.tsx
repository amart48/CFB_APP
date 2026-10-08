import { Panel } from "@/components/player/Panel";
import { BackLink } from "./TeamHeader";

const bar = "h-2 rounded-[2px] bg-border";

/** Placeholder rows for a panel that is still loading. */
export function PanelSkeleton({
  title,
  sub,
  rows = 5,
}: {
  title: string;
  sub?: string;
  rows?: number;
}) {
  return (
    <Panel title={title} sub={sub}>
      <div
        role="status"
        aria-label={`Loading ${title.toLowerCase()}`}
        className="flex flex-col gap-4 p-4 motion-safe:animate-pulse"
      >
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className={`${bar} w-full`} />
        ))}
      </div>
    </Panel>
  );
}

/** Whole-page loading state (matches the Figma loading frame). */
export function TeamSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading team"
      className="flex flex-col gap-5 motion-safe:animate-pulse"
    >
      <BackLink />
      <div className="flex items-center gap-4 py-1">
        <span className="border-border size-12 rounded-full border-2" />
        <div className="flex flex-col gap-2">
          <span className="bg-border h-5.5 w-40 rounded-[2px]" />
          <span className="bg-border h-2.5 w-80 rounded-[2px]" />
        </div>
      </div>
      <div className="border-border bg-surface grid h-15 grid-cols-7 border">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`flex flex-col justify-center gap-2 pl-4 ${i > 0 ? "border-border border-l" : ""}`}
          >
            <span className={`${bar} w-14`} />
            <span className={`${bar} w-10`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_640px] gap-5">
        <PanelSkeleton title="TEAM RANKINGS" rows={10} />
        <PanelSkeleton title="PPA PER PLAY BY GAME" rows={10} />
      </div>
      <PanelSkeleton title="SCHEDULE & RESULTS" rows={8} />
      <PanelSkeleton title="TEAM LEADERS" rows={3} />
      <PanelSkeleton title="ROSTER" rows={8} />
    </div>
  );
}
