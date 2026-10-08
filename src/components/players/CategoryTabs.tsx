import Link from "next/link";
import { CATEGORIES, type PlayerCategory } from "@/lib/players/categories";
import { playersHref } from "@/lib/players/params";

type Props = { active: PlayerCategory; query: string };

/** Category tabs. Links, so the active category is in the URL and server-rendered. */
export function CategoryTabs({ active, query }: Props) {
  return (
    <nav aria-label="Stat category" className="flex h-9 gap-7 overflow-x-auto">
      {CATEGORIES.map((c) => {
        const current = c.id === active.id;
        return (
          <Link
            key={c.id}
            href={playersHref(query, { category: c })}
            replace
            scroll={false}
            aria-current={current ? "page" : undefined}
            className={`text-body flex h-9 items-center border-b-2 whitespace-nowrap ${
              current
                ? "border-action text-fg font-semibold"
                : "text-fg-muted hover:text-fg border-transparent"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
