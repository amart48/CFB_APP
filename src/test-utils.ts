import { readFileSync } from "node:fs";
import path from "node:path";

/** Loads a saved raw CFBD response. Tests never call the live API. */
export function fixture<T>(name: string): T {
  const file = path.join(process.cwd(), "fixtures", `${name}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}
