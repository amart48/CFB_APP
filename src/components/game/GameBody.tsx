import { attempt } from "@/lib/cfbd/attempt";
import { loadBoxScore } from "@/lib/cfbd/boxScoreLoader";
import type { RawGame } from "@/lib/cfbd/schemas";
import { GameHeader } from "./GameHeader";
import { GameMessage } from "./GameShell";
import { LineStrip } from "./LineStrip";
import { PlayerPanels } from "./PlayerPanels";
import { ScoringSummary } from "./ScoringSummary";
import { TeamStatsPanel } from "./TeamStatsPanel";

/** Streams in behind the skeleton: the whole page needs the slice calls. */
export async function GameBody({ game }: { game: RawGame }) {
  const result = await attempt(() => loadBoxScore(game));
  if (!result.ok) {
    return (
      <GameMessage
        variant="error"
        title="Couldn't load this game"
        message={result.message}
      />
    );
  }
  const box = result.data;
  return (
    <>
      <GameHeader box={box} />
      <LineStrip box={box} />
      <TeamStatsPanel box={box} />
      <ScoringSummary box={box} />
      <PlayerPanels box={box} />
    </>
  );
}
