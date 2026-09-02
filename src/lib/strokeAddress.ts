/**
 * Where the stroke browser lives.
 *
 * A stroke count is a place - `/strokes/12` - so it can be linked, reloaded
 * and walked with the back button, the way the maps are. What is on the page
 * rather than what the page is stays in the query: which page of a long count
 * you are reading, and whether the uncommon characters are shown.
 */
export const STROKES_HREF = "/strokes";
export const STROKE_PARAMS = { common: "common", page: "page" } as const;

export function strokesHref(
  strokes: number | null,
  options: { commonOnly?: boolean; page?: number } = {},
): string {
  if (strokes === null) return STROKES_HREF;
  const params = new URLSearchParams();
  if (options.commonOnly) params.set(STROKE_PARAMS.common, "1");
  if (options.page && options.page > 1) params.set(STROKE_PARAMS.page, String(options.page));
  const search = params.toString();
  return `${STROKES_HREF}/${strokes}${search ? `?${search}` : ""}`;
}

/**
 * The count a path names.
 *
 * Three answers, not two: `null` is the index, which is a page; `undefined`
 * is a path that names nothing, which is a 404. Collapsing them would open
 * the index for `/strokes/twelve` and quietly pretend it meant something.
 */
export function strokesFromPath(segments: readonly string[] | undefined): number | null | undefined {
  if (!segments || segments.length === 0) return null;
  if (segments.length > 1) return undefined;
  const value = Number(segments[0]);
  return Number.isInteger(value) && value > 0 && value < 100 ? value : undefined;
}

export function readCommonOnly(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === "1";
}

export function readPage(value: string | string[] | undefined): number {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}
