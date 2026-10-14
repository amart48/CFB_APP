import { Attribution } from "@/components/scoreboard/PageHeader";
import { StateBody } from "@/components/scoreboard/StateMessage";
import { CareerPanel } from "@/components/player/CareerPanel";
import { GameLogPanel } from "@/components/player/GameLogPanel";
import { BackLink, PlayerHeader } from "@/components/player/PlayerHeader";
import { SeasonStatsPanel } from "@/components/player/SeasonStatsPanel";
import { UsagePpaPanel } from "@/components/player/UsagePpaPanel";
import { Suspense } from "react";
import { attempt } from "@/lib/cfbd/attempt";
import { loadPlayerProfile } from "@/lib/cfbd/loaders";
import { readableOnDark } from "@/lib/utils/color";
import { parsePlayerSlug } from "@/lib/utils/slug";

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata(props: PageProps<"/players/[slug]">) {
  const parsed = parsePlayerSlug((await props.params).slug);
  return {
    title: `${parsed?.name ? titleCase(parsed.name) : "Player"} · CFB Stats`,
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-col gap-5 px-4 pt-4 md:px-10">
      {children}
      <Attribution />
    </main>
  );
}

function NotFound({ message }: { message?: string }) {
  return (
    <Shell>
      <BackLink />
      <div className="border-border bg-surface border">
        <StateBody
          variant="empty"
          title="Player not found"
          message={
            message ??
            "We could not find stats for this player in the selected season. Try another season, or search the leaderboards."
          }
          action={{ href: "/players", label: "Back to Player Stats" }}
        />
      </div>
    </Shell>
  );
}

// Cold CFBD calls take 3-8s each; Vercel's default limit is too tight for a cold page.
export const maxDuration = 60;

export default async function PlayerPage(props: PageProps<"/players/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const parsed = parsePlayerSlug(slug);
  if (!parsed) return <NotFound />;

  const seasonParam = Number.parseInt(first(sp.season) ?? "", 10);
  const result = await attempt(() =>
    loadPlayerProfile({
      id: parsed.id,
      name: parsed.name,
      team: first(sp.team)?.slice(0, 60) ?? null,
      season: Number.isFinite(seasonParam) ? seasonParam : null,
    }),
  );
  if (!result.ok) {
    return (
      <Shell>
        <BackLink />
        <div className="border-border bg-surface border">
          <StateBody
            variant="error"
            title="Couldn't load this player"
            message={result.message}
          />
        </div>
      </Shell>
    );
  }
  if (result.data.kind === "not-found") return <NotFound />;

  const { profile } = result.data;
  const color = profile.team
    ? readableOnDark(profile.team.color, profile.team.altColor)
    : "#8b93a0";
  // Usage and PPA are offensive metrics: defenders, kickers and returners have none.
  const offensive =
    profile.primary === "passing" ||
    profile.primary === "rushing" ||
    profile.primary === "receiving";

  return (
    <Shell>
      <BackLink />
      <PlayerHeader profile={profile} />
      {(offensive || profile.usage || profile.ppa) && (
        <UsagePpaPanel usage={profile.usage} ppa={profile.ppa} color={color} />
      )}
      <SeasonStatsPanel profile={profile} />
      <Suspense fallback={null}>
        <CareerPanel profile={profile} />
      </Suspense>
      {(offensive || profile.games.length > 0) && (
        <GameLogPanel
          games={profile.games}
          season={profile.season}
          color={color}
        />
      )}
    </Shell>
  );
}
