/** "CW | The CW Network" to "CW". Null or blank renders as an em dash upstream. */
export function cleanTv(tv: string | null | undefined): string | null {
  const first = tv?.split(" | ")[0]?.trim();
  return first ? first : null;
}
