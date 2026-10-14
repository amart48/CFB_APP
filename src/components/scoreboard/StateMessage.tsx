import { SearchX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { ColumnHeadings } from "./GameList";

type Props = {
  variant: "empty" | "error";
  title: string;
  message: string;
  action?: { href: string; label: string };
};

/** The centered icon, message and action shared by every empty/error state. */
export function StateBody({ variant, title, message, action }: Props) {
  const Icon = variant === "empty" ? SearchX : TriangleAlert;
  return (
    <div
      role={variant === "error" ? "alert" : undefined}
      className="flex h-80 flex-col items-center justify-center gap-4 md:h-122"
    >
      <div className="border-border bg-surface-raised flex size-10 items-center justify-center rounded border">
        <Icon size={20} className="text-fg-muted" aria-hidden />
      </div>
      <div className="flex w-full max-w-125 flex-col items-center gap-2 px-4 text-center">
        <p className="text-title text-fg font-semibold">{title}</p>
        <p className="text-body text-fg-muted w-full leading-normal">
          {message}
        </p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="border-action text-body text-action hover:bg-action/10 flex h-8 items-center justify-center rounded border px-4 font-medium"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Scoreboard empty/error state: the message under the real column headings. */
export function StateMessage(props: Props) {
  return (
    <div>
      <div className="border-border bg-surface border">
        <ColumnHeadings />
        <StateBody {...props} />
      </div>
    </div>
  );
}
