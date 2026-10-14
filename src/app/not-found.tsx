import { BackLink, GameMessage, Shell } from "@/components/game/GameShell";

export default function NotFound() {
  return (
    <Shell>
      <BackLink />
      <GameMessage
        variant="empty"
        title="Page not found"
        message="This page does not exist. Try the scoreboard."
      />
    </Shell>
  );
}
