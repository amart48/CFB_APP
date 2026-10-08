"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SOON = "Coming soon";
const item = "flex h-full items-center border-b-2";

export function NavBar() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Scoreboard", active: pathname === "/" },
    { href: "/teams", label: "Teams", active: pathname.startsWith("/teams") },
    {
      href: "/players",
      label: "Players",
      active: pathname.startsWith("/players"),
    },
  ];
  return (
    <header className="border-border bg-surface flex h-14 items-center justify-between border-b px-10">
      <div className="flex h-full items-center gap-12">
        <Link href="/" className="text-supporting text-fg">
          CFB Stats
        </Link>
        <nav
          aria-label="Primary"
          className="text-body flex h-full items-center gap-7"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              className={`${item} ${
                l.active
                  ? "border-action text-fg font-semibold"
                  : "border-surface text-fg-muted hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div
        aria-disabled
        title={SOON}
        className="border-border bg-canvas text-table text-fg-muted flex h-8 w-65 items-center gap-2 rounded border px-2.5"
      >
        <Search size={14} aria-hidden />
        Search teams, players...
      </div>
    </header>
  );
}
