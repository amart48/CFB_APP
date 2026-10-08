import { Suspense } from "react";
import { LeadersPanel } from "@/components/team/LeadersPanel";
import { PpaChartPanel } from "@/components/team/PpaChartPanel";
import { RankingsPanel } from "@/components/team/RankingsPanel";
import { RosterPanel } from "@/components/team/RosterPanel";
import { SchedulePanel } from "@/components/team/SchedulePanel";
import { SummaryStrip } from "@/components/team/SummaryStrip";
import { BackLink, TeamHeader } from "@/components/team/TeamHeader";
import { PanelSkeleton } from "@/components/team/TeamSkeleton";
import { Attribution } from "@/components/scoreboard/PageHeader";
import { StateBody } from "@/components/scoreboard/StateMessage";
import { attempt } from "@/lib/cfbd/attempt";
import { loadTeamProfile } from "@/lib/cfbd/loaders";
import type { RosterFilter } from "@/lib/cfbd/normalize";
import { parsePlayerSlug } from "@/lib/utils/slug";

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;
const GROUPS: RosterFilter[] = ["offense", "defense", "special"];

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateMetadata(props: PageProps<"/teams/[slug]">) {
  const parsed = parsePlayerSlug((await props.params).slug);
  return {
    title: `${parsed?.name ? titleCase(parsed.name) : "Team"} · CFB Stats`,
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-col gap-5 px-10 pt-4">
      {children}
      <Attribution />
    </main>
  );
}

function Message({
  variant,
  title,
  message,
}: {
  variant: "empty" | "error";
  title: string;
  message: string;
}) {
  return (
    <Shell>
      <BackLink />
      <div className="border-border bg-surface border">
        <StateBody
          variant={variant}
          title={title}
          message={message}
          action={{ href: "/teams", label: "Back to Team Stats" }}
        />
      </div>
    </Shell>
  );
}

export default async function TeamPage(props: PageProps<"/teams/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const parsed = parsePlayerSlug(slug);
  const id = parsed ? Number(parsed.id) : NaN;
  const notFound = (
    <Message
      variant="empty"
      title="Team not found"
      message="We could not find this team in the selected season. Try another season, or browse the team table."
    />
  );
  if (!Number.isSafeInteger(id)) return notFound;

  const season = Number.parseInt(first(sp.season) ?? "", 10);
  const result = await attempt(() =>
    loadTeamProfile({ id, season: Number.isFinite(season) ? season : null }),
  );
  if (!result.ok) {
    return (
      <Message
        variant="error"
        title="Couldn't load this team"
        message={result.message}
      />
    );
  }
  if (result.data.kind === "not-found") return notFound;

  const { profile } = result.data;
  const groupParam = first(sp.group);
  const filter = GROUPS.find((g) => g === groupParam) ?? "all";
  const query = new URLSearchParams(
    Number.isFinite(season) ? { season: String(season) } : {},
  ).toString();
  const rosterQuery = new URLSearchParams(query);
  if (filter !== "all") rosterQuery.set("group", filter);

  return (
    <Shell>
      <BackLink />
      <TeamHeader profile={profile} />
      <SummaryStrip profile={profile} />
      <div className="grid grid-cols-[1fr_640px] items-start gap-5">
        <Suspense fallback={<PanelSkeleton title="TEAM RANKINGS" rows={10} />}>
          <RankingsPanel profile={profile} />
        </Suspense>
        <PpaChartPanel profile={profile} />
      </div>
      <SchedulePanel profile={profile} />
      <LeadersPanel profile={profile} />
      <RosterPanel
        profile={profile}
        filter={filter}
        query={rosterQuery.toString()}
      />
    </Shell>
  );
}
