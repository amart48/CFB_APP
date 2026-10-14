import type { PlayerCategory } from "@/lib/players/categories";
import type { PlayerSort } from "@/lib/players/sort";
import { PlayersTable } from "./PlayersTable";

const bar = "h-2 rounded-[2px] bg-border";
const NAME_WIDTHS = [100, 124, 148];

/** Loading state: the real headings with 12 placeholder rows, as in the Figma loading frame. */
export function PlayersSkeleton({
  category,
  sort,
}: {
  category: PlayerCategory;
  sort: PlayerSort;
}) {
  return (
    <div role="status" aria-label="Loading players">
      <p className="text-label text-fg-muted pb-2">
        Loading {category.label.toLowerCase()} leaders. The first load of each
        day can take up to 10 seconds; after that it is instant.
      </p>
      <div className="motion-safe:animate-pulse">
        <PlayersTable
          category={category}
          sort={sort}
          query=""
          interactive={false}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <tr key={i} className="border-border h-8 border-b">
              <td className="hidden pl-4 md:table-cell">
                <span className={`${bar} block w-3.5`} />
              </td>
              <td className="pl-3 md:pl-0">
                <span
                  className={`${bar} block`}
                  style={{ width: NAME_WIDTHS[i % 3] }}
                />
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <span className="bg-border size-5 rounded-full" />
                  <span className={`${bar} w-20`} />
                </div>
              </td>
              {category.columns.map((c) => (
                <td key={c.stat} className="pr-2">
                  <span className={`${bar} ml-auto block w-8`} />
                </td>
              ))}
            </tr>
          ))}
        </PlayersTable>
      </div>
    </div>
  );
}
