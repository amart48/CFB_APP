"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const SOON = "Coming soon";
const item = "flex h-full items-center border-b-2";

function SearchPlaceholder({ className }: { className: string }) {
  return (
    <div
      aria-disabled
      title={SOON}
      className={`border-border bg-canvas text-table text-fg-muted flex h-8 items-center gap-2 rounded border px-2.5 ${className}`}
    >
      <Search size={14} aria-hidden />
      Search teams, players...
    </div>
  );
}

export function NavBar() {
  const pathname = usePathname();
  // Menu is open for one pathname only, so navigating closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname;
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
    <header className="border-border bg-surface relative z-30 border-b">
      <div className="flex h-14 items-center justify-between px-4 md:px-10">
        <div className="flex h-full items-center gap-12">
          <Link href="/" className="text-supporting text-fg">
            CFB Stats
          </Link>
          <nav
            aria-label="Primary"
            className="text-body hidden h-full items-center gap-7 md:flex"
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
        <SearchPlaceholder className="hidden w-65 md:flex" />
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setOpenPath(menuOpen ? null : pathname)}
          className="text-fg hover:bg-surface-raised focus-visible:outline-action -mr-2 flex size-11 items-center justify-center rounded focus-visible:outline-2 md:hidden"
        >
          {menuOpen ? (
            <X size={20} aria-hidden />
          ) : (
            <Menu size={20} aria-hidden />
          )}
        </button>
      </div>
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-border bg-surface absolute inset-x-0 top-full border-b md:hidden"
        >
          <nav aria-label="Primary mobile" className="text-body flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.active ? "page" : undefined}
                className={`flex h-12 items-center border-l-2 px-4 ${
                  l.active
                    ? "border-action bg-surface-raised text-fg font-semibold"
                    : "text-fg-muted hover:text-fg border-transparent"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 pt-2">
            <SearchPlaceholder className="h-10 w-full" />
          </div>
        </div>
      )}
    </header>
  );
}
