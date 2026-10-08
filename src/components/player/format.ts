const DASH = "—";

/** 0.505 to "50.5%". */
export const pct = (n: number | null | undefined) =>
  n == null ? DASH : `${(n * 100).toFixed(1)}%`;

/** PPA to two decimals ("-0.10"). */
export const ppa = (n: number | null | undefined) =>
  n == null ? DASH : n.toFixed(2);
