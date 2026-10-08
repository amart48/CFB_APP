import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CfbdError } from "./errors";
import { cfbdGet } from "./http";

const schema = z.array(z.object({ id: z.number() }));

function mockFetch(res: Response | Error) {
  const fn = vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const call = () =>
  cfbdGet("/x", { schema, revalidate: 60, params: { b: 2, a: 1 } });

const LIMITER_KEY = Symbol.for("cfb-stats.cfbd.limiter");
type Limiter = { active: number; waiting: (() => void)[]; pausedUntil: number };
const resetLimiter = () => {
  const l = (globalThis as unknown as Record<symbol, Limiter | undefined>)[
    LIMITER_KEY
  ];
  if (l) Object.assign(l, { active: 0, waiting: [], pausedUntil: 0 });
};

beforeEach(() => {
  vi.stubEnv("CFBD_API_KEY", "test-key");
  resetLimiter();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetLimiter();
});

describe("cfbdGet", () => {
  it("sends bearer auth, sorted params and the revalidate window", async () => {
    const fn = mockFetch(Response.json([{ id: 1 }]));
    await expect(call()).resolves.toEqual([{ id: 1 }]);
    const [url, init] = fn.mock.calls[0] as unknown as [
      URL,
      RequestInit & { next: unknown },
    ];
    expect(url.search).toBe("?a=1&b=2");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it("throws a config error when the key is missing", async () => {
    vi.stubEnv("CFBD_API_KEY", "");
    mockFetch(Response.json([]));
    await expect(call()).rejects.toMatchObject({ kind: "config" });
  });

  describe("rate limiting", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const tooMany = () =>
      new Response("", { status: 429, headers: { "retry-after": "1" } });

    it("retries a 429 after Retry-After and then succeeds", async () => {
      const fn = vi
        .fn()
        .mockResolvedValueOnce(tooMany())
        .mockResolvedValueOnce(Response.json([{ id: 7 }]));
      vi.stubGlobal("fetch", fn);
      const p = call();
      await vi.advanceTimersByTimeAsync(1000);
      await expect(p).resolves.toEqual([{ id: 7 }]);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("gives up after repeated 429s with a rate-limit error", async () => {
      const fn = vi.fn(
        async () =>
          new Response("", { status: 429, headers: { "retry-after": "30" } }),
      );
      vi.stubGlobal("fetch", fn);
      const p = call().catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(20_000); // delays are capped at 5s each
      const err = await p;
      expect(err).toMatchObject({ kind: "rate-limit", retryAfterSeconds: 30 });
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it("never has more than 2 requests in flight", async () => {
      let inFlight = 0;
      let peak = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((r) => setTimeout(r, 100));
          inFlight -= 1;
          return Response.json([{ id: 1 }]);
        }),
      );
      const all = Promise.all(Array.from({ length: 8 }, () => call()));
      await vi.advanceTimersByTimeAsync(1000);
      await all;
      expect(peak).toBe(2);
    });
  });

  it("can skip Next's fetch cache for oversized responses", async () => {
    const fn = mockFetch(Response.json([{ id: 1 }]));
    await cfbdGet("/x", { schema, revalidate: 60, noStore: true });
    const [, init] = fn.mock.calls[0] as unknown as [
      URL,
      RequestInit & { next?: unknown },
    ];
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
  });

  it.each([401, 403])("maps %i to auth", async (status) => {
    mockFetch(new Response("", { status }));
    await expect(call()).rejects.toMatchObject({ kind: "auth", status });
  });

  it("maps other failures to http", async () => {
    mockFetch(new Response("", { status: 500 }));
    await expect(call()).rejects.toMatchObject({ kind: "http", status: 500 });
  });

  it("maps fetch failure to network", async () => {
    mockFetch(new Error("offline"));
    await expect(call()).rejects.toMatchObject({ kind: "network" });
  });

  it("maps schema mismatch to parse and never leaks the key", async () => {
    mockFetch(Response.json([{ id: "nope" }]));
    const err = await call().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CfbdError);
    expect((err as CfbdError).kind).toBe("parse");
    expect((err as CfbdError).userMessage).not.toContain("test-key");
  });

  describe("shared limiter", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("keeps the cap of 2 across separately loaded copies of the module (Next bundles per route)", async () => {
      let inFlight = 0;
      let peak = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((r) => setTimeout(r, 100));
          inFlight -= 1;
          return Response.json([{ id: 1 }]);
        }),
      );
      // three independent copies, as three route bundles would be
      const copies = [];
      for (let i = 0; i < 3; i++) {
        vi.resetModules();
        copies.push((await import("./http")).cfbdGet);
      }
      const all = Promise.all(
        copies.flatMap((get) =>
          Array.from({ length: 4 }, () =>
            get("/x", { schema, revalidate: 60 }),
          ),
        ),
      );
      await vi.advanceTimersByTimeAsync(2000);
      await all;
      expect(peak).toBe(2);
    });

    it("never exceeds the cap when a freed slot is contested by a newcomer", async () => {
      let inFlight = 0;
      let peak = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          return Response.json([{ id: 1 }]);
        }),
      );
      const all = Promise.all(Array.from({ length: 50 }, () => call()));
      await vi.advanceTimersByTimeAsync(100);
      await all;
      expect(peak).toBeLessThanOrEqual(2);
    });

    it("a 429 on one request holds back every other request, not just its own retry", async () => {
      const starts: number[] = [];
      let n = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          starts.push(Date.now());
          n += 1;
          // first call is rate limited, the rest succeed
          return n === 1
            ? new Response("", { status: 429, headers: { "retry-after": "2" } })
            : Response.json([{ id: 1 }]);
        }),
      );
      const t0 = Date.now();
      const first = call();
      await vi.advanceTimersByTimeAsync(0); // first request goes out and gets its 429
      const second = call(); // a different request starting right after
      await vi.advanceTimersByTimeAsync(5000);
      await Promise.all([first, second]);
      // calls 2 and 3 (the second request and the first's retry) wait out the 2s pause
      expect(starts[0]).toBe(t0);
      expect(starts.slice(1).every((t) => t - t0 >= 2000)).toBe(true);
    });
  });
});
