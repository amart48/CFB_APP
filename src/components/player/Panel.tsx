/** A bordered section with the small raised title bar used across the player page. */
export function Panel({
  title,
  sub,
  leading,
  children,
}: {
  title: string;
  sub?: string;
  /** Small marker before the title (a live dot, a team ring). */
  leading?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="border-border bg-surface border">
      <div className="border-border bg-surface-raised flex h-7 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          {leading}
          <h2 className="text-label text-fg font-semibold">{title}</h2>
        </div>
        {sub && <p className="text-label text-fg-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}
