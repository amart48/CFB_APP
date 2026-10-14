import { GAME_GRID } from "./columns";
import { ColumnHeadings } from "./GameList";

const bar = "h-2 rounded-[2px] bg-border";

function SkeletonRow({ nameWidth }: { nameWidth: string }) {
  return (
    <>
      <div className="border-border bg-surface flex h-20 flex-col justify-center gap-2.5 border-b px-3 md:hidden">
        <span className={`${bar} w-12`} />
        <div className="flex items-center gap-2">
          <span className="bg-border size-5 rounded-full" />
          <span className={bar} style={{ width: nameWidth }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-border size-5 rounded-full" />
          <span className={bar} style={{ width: nameWidth }} />
        </div>
      </div>
      <div
        className={`${GAME_GRID} border-border bg-surface hidden h-9 border-b px-4 md:grid`}
      >
        <span className={`${bar} w-12`} />
        <div className="flex items-center gap-2">
          <span className="bg-border size-5 rounded-full" />
          <span className={bar} style={{ width: nameWidth }} />
        </div>
        <span className={`${bar} mx-auto w-4.5`} />
        <div className="flex items-center gap-2">
          <span className="bg-border size-5 rounded-full" />
          <span className={bar} style={{ width: nameWidth }} />
        </div>
        <span className={`${bar} mx-auto w-4.5`} />
        <span className={`${bar} w-26`} />
        <span className={`${bar} w-12`} />
        <span className="bg-border mx-auto h-1 w-3 rounded-[2px]" />
      </div>
    </>
  );
}

function SkeletonDay({ rows }: { rows: number }) {
  const widths = ["100px", "124px", "148px"];
  return (
    <div>
      <div className="border-border bg-surface-raised flex h-7 items-center border-b px-3 md:px-4">
        <span className={`${bar} w-26`} />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} nameWidth={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Loading state: the real column headings with placeholder rows, as in the Figma loading frame. */
export function GamesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading games"
      className="motion-safe:animate-pulse"
    >
      <div className="border-border bg-surface border">
        <ColumnHeadings />
        <SkeletonDay rows={3} />
        <SkeletonDay rows={9} />
      </div>
    </div>
  );
}
