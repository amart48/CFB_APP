import { notFound } from "next/navigation";
import { attempt } from "@/lib/cfbd/attempt";
import { loadMeta, loadWeekData } from "@/lib/cfbd/loaders";

// Raw data-shape check page. Not part of the product UI.
export const dynamic = "force-dynamic";

export default async function TestDataPage() {
  // Dev-only: this would spend CFBD calls and expose raw data on a public deploy.
  if (process.env.NODE_ENV === "production") notFound();
  const result = await attempt(async () => {
    const meta = await loadMeta({ season: null, week: null });
    return { meta, data: await loadWeekData(meta) };
  });
  if (!result.ok) return <main className="p-10">{result.message}</main>;

  const { meta, data } = result.data;
  return (
    <main className="text-table space-y-2 p-10">
      <h1 className="text-heading">Test data</h1>
      <p className="text-fg-muted">
        {meta.season} {meta.selected.label} · {data.games.length} games ·{" "}
        {Object.keys(meta.teams).length} teams · AP poll week{" "}
        {data.rankingsWeek ?? "none"} · {Object.keys(data.stats).length} games
        with stats · {data.unmatchedStats.length} unmatched · current=
        {String(meta.isCurrent)} past={String(meta.isPast)}
      </p>
      <pre className="text-micro overflow-x-auto">
        {JSON.stringify(data.games.slice(0, 3), null, 2)}
      </pre>
    </main>
  );
}
