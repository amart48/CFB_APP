import { BackLink, GameMessage, Shell } from "@/components/game/GameShell";

export default function GameNotFound() {
  return (
    <Shell>
      <BackLink />
      <GameMessage
        variant="empty"
        title="Game not found"
        message="We could not find this game. The link may be wrong or the game is no longer listed. Try the scoreboard."
      />
    </Shell>
  );
}
