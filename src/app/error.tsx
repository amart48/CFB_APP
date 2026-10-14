"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

// This Next.js version passes `retry`, not `reset`, to error boundaries.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-360 flex-col px-4 pt-4 md:px-10">
      <div className="border-border bg-surface border">
        <div
          role="alert"
          className="flex h-80 flex-col items-center justify-center gap-4 md:h-122"
        >
          <div className="border-border bg-surface-raised flex size-10 items-center justify-center rounded border">
            <TriangleAlert size={20} className="text-fg-muted" aria-hidden />
          </div>
          <div className="flex w-full max-w-125 flex-col items-center gap-2 px-4 text-center">
            <p className="text-title text-fg font-semibold">
              Something went wrong
            </p>
            <p className="text-body text-fg-muted w-full leading-normal">
              This page failed to load. Try again in a moment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => retry()}
            className="border-action text-body text-action hover:bg-action/10 flex h-8 items-center justify-center rounded border px-4 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
