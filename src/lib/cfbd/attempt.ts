import { CfbdError } from "./errors";

export type Attempt<T> = { ok: true; data: T } | { ok: false; message: string };

/** Runs a loader and turns CFBD failures into a user-safe message instead of a crash. */
export async function attempt<T>(fn: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof CfbdError) {
      console.error(`[cfbd] ${e.kind}: ${e.message}`);
      return { ok: false, message: e.userMessage };
    }
    console.error("[cfbd] unexpected error", e);
    return { ok: false, message: "Something went wrong loading the data." };
  }
}
