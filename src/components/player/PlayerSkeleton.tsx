import { BackLink } from "./PlayerHeader";
import { Panel } from "./Panel";

const bar = "h-2 rounded-[2px] bg-border";

/** Loading state: same layout, placeholder values (matches the Figma loading frame). */
export function PlayerSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading player"
      className="flex flex-col gap-5 motion-safe:animate-pulse"
    >
      <BackLink />
      <div className="flex items-center gap-4 py-1">
        <span className="border-border size-12 rounded-full border-2" />
        <div className="flex flex-col gap-2">
          <span className="bg-border h-5.5 w-45 rounded-[2px]" />
          <span className="bg-border h-2.5 w-35 rounded-[2px]" />
        </div>
      </div>
      <div className="border-border bg-border grid grid-cols-2 gap-px border sm:grid-cols-3 md:h-15 md:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-surface flex flex-col justify-center gap-2 py-2.5 pl-4 md:py-0"
          >
            <span className={`${bar} w-12`} />
            <span className={`${bar} w-14`} />
          </div>
        ))}
      </div>
      {["USAGE & PPA", "SEASON STATS", "GAME LOG · PPA PER PLAY"].map((t) => (
        <Panel key={t} title={t}>
          <div className="flex flex-col gap-4 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`${bar} w-full`} />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
