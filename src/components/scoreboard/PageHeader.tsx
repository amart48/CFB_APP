export function PageHeader({
  season,
  weekLabel,
}: {
  season: number;
  weekLabel: string;
}) {
  return (
    <div className="flex h-21 items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-heading text-fg font-normal">Scoreboard</h1>
        <p className="text-body text-fg-muted">
          {season} Season, {weekLabel}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span aria-hidden className="bg-fg-muted size-1.25" />
        <span className="text-label tracking-caps text-fg-muted whitespace-nowrap">
          NCAA FOOTBALL · FBS
        </span>
      </div>
    </div>
  );
}

export function Attribution() {
  return (
    <footer className="text-label text-fg-muted flex h-16 items-center justify-between">
      <a href="https://collegefootballdata.com" className="hover:text-fg">
        Data via CollegeFootballData.com
      </a>
    </footer>
  );
}
