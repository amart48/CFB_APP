import type { z } from "zod";
import { CFBD_BASE_URL, LOW_CALLS_WARNING } from "./config";
import { CfbdError } from "./errors";

type Params = Record<string, string | number | boolean | undefined>;

type GetOptions<S extends z.ZodType> = {
  schema: S;
  /** Required: every call sets an explicit cache window (seconds). */
  revalidate: number;
  params?: Params;
  /**
   * Skip Next's fetch cache. Only for responses over its 2MB limit, whose normalized result the
   * caller caches instead (e.g. with unstable_cache).
   */
  noStore?: boolean;
};

/**
 * CFBD answers 429 with `Retry-After: 1` when more than 2 requests are in flight (verified: 3
 * parallel calls fail, 2 do not, even over 90 calls). Cap concurrency at 2 across the WHOLE
 * PROCESS and retry a 429.
 *
 * The state lives on `globalThis`, not in module scope: Next bundles server code per route (and
 * per layer), so a module-level counter is duplicated and the effective cap becomes 2 per route.
 * Five cold pages at once used to produce a burst of 429s for exactly that reason.
 */
const MAX_CONCURRENT = 2;
const MAX_ATTEMPTS = 4;
const MAX_RETRY_DELAY_MS = 5_000;

type LimiterState = {
  active: number;
  waiting: (() => void)[];
  /** After any 429, nobody starts a request until this time (ms epoch). */
  pausedUntil: number;
};
const GLOBAL_KEY = Symbol.for("cfb-stats.cfbd.limiter");
const store = globalThis as typeof globalThis & { [GLOBAL_KEY]?: LimiterState };
const limiter: LimiterState = (store[GLOBAL_KEY] ??= {
  active: 0,
  waiting: [],
  pausedUntil: 0,
});

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  // Re-check after every wake-up: a slot freed for us may be taken by a newcomer first, and a
  // 429 elsewhere may have paused everyone. No await between the final check and the increment.
  for (;;) {
    const pause = limiter.pausedUntil - Date.now();
    if (pause > 0) {
      await sleep(pause);
      continue;
    }
    if (limiter.active < MAX_CONCURRENT) break;
    await new Promise<void>((resolve) => limiter.waiting.push(resolve));
  }
  limiter.active += 1;
  try {
    return await fn();
  } finally {
    limiter.active -= 1;
    limiter.waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(path: string, params: Params = {}): URL {
  const url = new URL(CFBD_BASE_URL + path);
  // Sorted so identical requests share a cache key and dedupe within a render.
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

/** The only place that talks to CFBD. Server-side only: reads CFBD_API_KEY. */
export async function cfbdGet<S extends z.ZodType>(
  path: string,
  { schema, revalidate, params, noStore = false }: GetOptions<S>,
): Promise<z.infer<S>> {
  const key = process.env.CFBD_API_KEY;
  if (!key) {
    throw new CfbdError("config", "CFBD_API_KEY is not set", { path });
  }

  const url = buildUrl(path, params);
  const request = () =>
    withSlot(() =>
      fetch(url, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        ...(noStore
          ? { cache: "no-store" as const }
          : { next: { revalidate } }),
      }),
    );

  let res: Response | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      res = await request();
    } catch (cause) {
      throw new CfbdError(
        "network",
        `Network error calling ${path}: ${String(cause)}`,
        { path },
      );
    }
    if (res.status !== 429 || attempt === MAX_ATTEMPTS) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const seconds =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1;
    const delay = Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    limiter.pausedUntil = Math.max(limiter.pausedUntil, Date.now() + delay);
    await sleep(delay);
  }
  if (!res)
    throw new CfbdError("network", `No response from ${path}`, { path });

  const remaining = Number(res.headers.get("x-calllimit-remaining"));
  if (Number.isFinite(remaining) && remaining < LOW_CALLS_WARNING) {
    console.warn(`[cfbd] only ${remaining} API calls left this month`);
  }

  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after"));
    throw new CfbdError("rate-limit", `Rate limited on ${path}`, {
      path,
      status: 429,
      retryAfterSeconds: Number.isFinite(retry) ? retry : undefined,
    });
  }
  if (res.status === 401 || res.status === 403) {
    throw new CfbdError("auth", `Auth failed on ${path} (${res.status})`, {
      path,
      status: res.status,
    });
  }
  if (!res.ok) {
    throw new CfbdError("http", `HTTP ${res.status} on ${path}`, {
      path,
      status: res.status,
    });
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new CfbdError("parse", `Invalid JSON from ${path}`, { path });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new CfbdError(
      "parse",
      `Unexpected shape from ${path}: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
      { path },
    );
  }
  return parsed.data;
}
