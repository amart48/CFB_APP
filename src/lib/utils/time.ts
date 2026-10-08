const ET = "America/New_York";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: ET,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  hour: "numeric",
  minute: "2-digit",
});
const headingFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  weekday: "long",
  month: "short",
  day: "numeric",
});

/** "2026-10-10" in Eastern time. Used for day grouping so late games stay on their day. */
export function etDayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso));
}

/** "7:30 PM" in Eastern time, or "TBD". */
export function formatEtTime(iso: string, startTbd = false): string {
  return startTbd ? "TBD" : timeFmt.format(new Date(iso));
}

/** "Saturday, Oct 10" in Eastern time. */
export function formatEtDayHeading(iso: string): string {
  return headingFmt.format(new Date(iso));
}

/** "34:41" to seconds. Returns 0 for missing or malformed input. */
export function clockToSeconds(clock: string | null | undefined): number {
  const m = /^(\d+):(\d{2})$/.exec(clock ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/** Seconds to "34:41". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const shortDateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** "Sat, Sep 5" in Eastern time. */
export function formatEtShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso));
}

/** CFBD's live game clock is zero-padded ("00:28", "07:02"); show "0:28", "7:02". */
export function cleanGameClock(
  clock: string | null | undefined,
): string | null {
  const m = /^(\d+):(\d{2})$/.exec((clock ?? "").trim());
  return m ? `${Number(m[1])}:${m[2]}` : null;
}
