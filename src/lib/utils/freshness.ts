/**
 * Tracks which data a visitor has already seen so entrance motion plays only for new or changed
 * content. Only short hashes are stored (one small map per view), never the data itself.
 */

export type SeenMap = Record<string, string>;

const PREFIX = "cfb:seen:";

/** Small, stable string hash (djb2 over JSON). Not cryptographic. */
export function hashOf(value: unknown): string {
  const text = JSON.stringify(value) ?? "";
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Ids whose hash is missing or different from the last visit. Everything is new on a first visit. */
export function changedIds(prev: SeenMap | null, next: SeenMap): Set<string> {
  const out = new Set<string>();
  for (const [id, hash] of Object.entries(next)) {
    if (!prev || prev[id] !== hash) out.add(id);
  }
  return out;
}

export function readSeen(
  viewKey: string,
  storage: Pick<Storage, "getItem"> | null = safeStorage(),
): SeenMap | null {
  try {
    const raw = storage?.getItem(PREFIX + viewKey);
    return raw ? (JSON.parse(raw) as SeenMap) : null;
  } catch {
    return null;
  }
}

export function writeSeen(
  viewKey: string,
  seen: SeenMap,
  storage: Pick<Storage, "setItem"> | null = safeStorage(),
): void {
  try {
    storage?.setItem(PREFIX + viewKey, JSON.stringify(seen));
  } catch {
    // Storage full or blocked: motion simply replays next time.
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
