"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  changedIds,
  prefersReducedMotion,
  readSeen,
  writeSeen,
  type SeenMap,
} from "@/lib/utils/freshness";

type Props = {
  /** Identifies the dataset (e.g. season + week). Seen hashes are remembered per key. */
  viewKey: string;
  /** Hash per item id for the whole dataset, independent of any filters. */
  items: SeenMap;
  className?: string;
  children: ReactNode;
};

const MAX_STAGGER = 20;
const STEP_MS = 18;

/**
 * Fades in descendants marked `data-reveal-id` once on mount, but only those that are new or changed
 * since this browser last saw the dataset. Unchanged data renders with no motion.
 */
export function Reveal({ viewKey, items, className, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const signature = JSON.stringify(items);

  useLayoutEffect(() => {
    const next = JSON.parse(signature) as SeenMap;
    const changed = changedIds(readSeen(viewKey), next);
    writeSeen(viewKey, next);
    if (changed.size === 0 || prefersReducedMotion()) return;
    if (typeof HTMLElement.prototype.animate !== "function") return;

    const nodes = Array.from(
      root.current?.querySelectorAll<HTMLElement>("[data-reveal-id]") ?? [],
    ).filter((n) => changed.has(n.dataset.revealId ?? ""));
    const animations = nodes.map((node, i) =>
      node.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 280,
          delay: Math.min(i, MAX_STAGGER) * STEP_MS,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      ),
    );
    return () => animations.forEach((a) => a.cancel());
  }, [viewKey, signature]);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
