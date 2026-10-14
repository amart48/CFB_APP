"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, readSeen, writeSeen } from "./freshness";

/** True when this browser has not yet seen this exact data for the view (and motion is allowed). */
export function useIsFresh(viewKey: string, hash: string): boolean {
  const [fresh] = useState(
    () =>
      typeof window !== "undefined" &&
      !prefersReducedMotion() &&
      readSeen(viewKey)?.data !== hash,
  );
  useEffect(() => writeSeen(viewKey, { data: hash }), [viewKey, hash]);
  return fresh;
}
