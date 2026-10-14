import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Attribution } from "@/components/scoreboard/PageHeader";
import { StateBody } from "@/components/scoreboard/StateMessage";

export function BackLink() {
  return (
    <Link
      href="/"
      className="text-table text-fg-muted hover:text-fg flex h-6 w-fit items-center gap-1.5"
    >
      <ArrowLeft size={14} aria-hidden />
      Scoreboard
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-col gap-5 px-4 pt-4 md:px-10">
      {children}
      <Attribution />
    </main>
  );
}

/** Bordered empty or error state with a way back to the scoreboard. */
export function GameMessage({
  variant,
  title,
  message,
}: {
  variant: "empty" | "error";
  title: string;
  message: string;
}) {
  return (
    <div className="border-border bg-surface border">
      <StateBody
        variant={variant}
        title={title}
        message={message}
        action={{ href: "/", label: "Back to Scoreboard" }}
      />
    </div>
  );
}
