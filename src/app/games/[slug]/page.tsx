import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameBody } from "@/components/game/GameBody";
import { GameSkeleton } from "@/components/game/GameSkeleton";
import { BackLink, GameMessage, Shell } from "@/components/game/GameShell";
import { attempt } from "@/lib/cfbd/attempt";
import { loadGame } from "@/lib/cfbd/boxScoreLoader";
import { parsePlayerSlug } from "@/lib/utils/slug";

const titleCase = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(" At ", " at ");

export async function generateMetadata(props: PageProps<"/games/[slug]">) {
  const parsed = parsePlayerSlug((await props.params).slug);
  return {
    title: `${parsed?.name ? titleCase(parsed.name) : "Game"} · CFB Stats`,
  };
}

/**
 * The cheap `/games?id=` lookup runs before anything streams, so a bad id is a real 404 (there is
 * deliberately no route-level loading.tsx: it would flush a 200 first). The heavy slice calls
 * stream in behind the skeleton.
 */
// Cold CFBD calls take 3-8s each; Vercel's default limit is too tight for a cold page.
export const maxDuration = 60;

export default async function GamePage(props: PageProps<"/games/[slug]">) {
  const { slug } = await props.params;
  const parsed = parsePlayerSlug(slug);
  const id = parsed ? Number(parsed.id) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const found = await attempt(() => loadGame(id));
  if (!found.ok) {
    return (
      <Shell>
        <BackLink />
        <GameMessage
          variant="error"
          title="Couldn't load this game"
          message={found.message}
        />
      </Shell>
    );
  }
  if (!found.data) notFound();

  return (
    <Shell>
      <BackLink />
      <Suspense fallback={<GameSkeleton />}>
        <GameBody game={found.data} />
      </Suspense>
    </Shell>
  );
}
