import { writeSources, type KanjiSource } from "@/lib/kanjiSourceFilters";

/**
 * Where the stroke browser lives.
 *
 * A stroke count is a place - `/strokes/12` - so it can be linked, reloaded
 * and walked with the back button, the way the maps are. What is on the page
 * rather than what the page is stays in the query: which page of a long count
 * you are reading, which lists it has been narrowed to, and which parts.
 *
 * The parts are in the address for the same reason the count is in the path:
 * "the 17-stroke kanji with a mouth in them" is an answer somebody wants to
 * send to somebody else. Spelled the way `/radicals` spells it - one
 * character each, no separator - so the two pages read the same query.
 */
export const STROKES_HREF = "/strokes";
export const STROKE_PARAMS = { sources: "sources", page: "page", parts: "parts", type: "type" } as const;

export function strokesHref(
  strokes: number | null,
  options: { sources?: readonly KanjiSource[]; page?: number; parts?: readonly string[]; type?: string } = {},
): string {
  if (strokes === null) return STROKES_HREF;
  const params = new URLSearchParams();
  /* `common` was a flag of its own until it became one of five filters that
     ask the same kind of question - which list teaches this character. */
  if (options.sources && options.sources.length > 0) params.set(STROKE_PARAMS.sources, writeSources(options.sources));
  /* Never carried forward: narrowing changes what is on page one, so page
     four of the old set is a page of nothing. */
  /* Kanji is the default and never rides in the address: a link that spells
     out the state it did not change is a link that looks like a filter. */
  if (options.type && options.type !== "kanji") params.set(STROKE_PARAMS.type, options.type);
  if (options.parts && options.parts.length > 0) params.set(STROKE_PARAMS.parts, options.parts.join(""));
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



export function readPage(value: string | string[] | undefined): number {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

/**
 * Where `/strokes` sends a reader, since the index has nothing of its own.
 *
 * It used to render a panel saying "pick a stroke count above" next to the
 * counts - a whole page whose content was an instruction to use the page. The
 * first count is a real answer to the same question, so the index opens there
 * and the address bar says which one it opened on.
 *
 * The first count the data has rather than the number one, so a dataset that
 * starts somewhere else still lands on a page that exists.
 */
export function strokesIndexHref(counts: ReadonlyArray<{ strokes: number }>): string {
  const first = counts[0];
  return first ? strokesHref(first.strokes) : STROKES_HREF;
}
