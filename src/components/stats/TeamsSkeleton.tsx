import { COLUMNS, GROUP_STARTS } from "@/lib/teams/columns";
import { DEFAULT_SORT } from "@/lib/teams/sort";
import { TeamsTableFrame } from "./TeamsTableFrame";

const bar = "h-2 rounded-[2px] bg-border";
const NAME_WIDTHS = [100, 124, 148];

/** Loading state: the real headings with placeholder rows, as in the Figma loading frame. */
export function TeamsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading teams"
      className="motion-safe:animate-pulse"
    >
      <TeamsTableFrame sort={DEFAULT_SORT}>
        {Array.from({ length: 12 }, (_, i) => (
          <tr key={i} className="border-border h-8 border-b">
            <td className="hidden pl-4 md:table-cell">
              <span className={`${bar} block w-3.5`} />
            </td>
            {COLUMNS.map((c) => (
              <td
                key={c.key}
                className={`${GROUP_STARTS.has(c.key) ? "border-border border-l" : ""} ${
                  c.key === "team" ? "" : "pr-2"
                }`}
              >
                {c.key === "team" ? (
                  <div className="flex items-center gap-2 pl-3 md:pl-0">
                    <span className="bg-border size-5 rounded-full" />
                    <span
                      className={bar}
                      style={{ width: NAME_WIDTHS[i % 3] }}
                    />
                  </div>
                ) : (
                  <span
                    className={`${bar} ml-auto block ${c.key === "rec" ? "w-7" : "w-8"}`}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </TeamsTableFrame>
    </div>
  );
}
