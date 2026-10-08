/** Background the team colors sit on (matches the canvas token). */
const DARK_BG = "#0b0d10";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 1;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A version of a team color that stays visible on the dark background
 * (WCAG non-text contrast 3:1 by default). Falls back to the alternate color
 * if it already passes, else lightens toward white. Use for bars, text and
 * chart series; the 2px row accent can use the raw color.
 */
export function readableOnDark(
  color: string,
  altColor?: string,
  min = 3,
): string {
  if (contrastRatio(color, DARK_BG) >= min) return color;
  if (
    altColor &&
    contrastRatio(altColor, DARK_BG) >= min &&
    altColor.toLowerCase() !== "#ffffff"
  ) {
    return altColor;
  }
  const rgb = parseHex(color);
  if (!rgb) return color;
  for (let t = 0.1; t <= 1; t += 0.1) {
    const mixed = toHex(
      rgb.map((v) => v + (255 - v) * t) as [number, number, number],
    );
    if (contrastRatio(mixed, DARK_BG) >= min) return mixed;
  }
  return "#ffffff";
}
