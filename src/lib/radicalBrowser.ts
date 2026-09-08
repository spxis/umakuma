import { writeSources, type KanjiSource } from "./kanjiSourceFilters";
import { RADICAL_BROWSER_PARAMS } from "./radicalBrowserParams";
import type { RadicalGroup } from "./radicalSearch";

/**
 * The radicals, as a page rather than as a picker.
 *
 * The picker in search asks "which kanji has these parts" and lives inside a
 * dropdown; this asks "what are the parts" and is a page you can send someone.
 *
 * Every radical is on the page, always. A first version put stroke counts
 * along the top as a filter, the way the stroke browser does - and that is
 * exactly wrong here: 900 kanji at one stroke count have to be narrowed to be
 * readable, while 253 radicals are a set you scan. Choosing "3 strokes" hid
 * the 208 radicals somebody was looking at to find the one they wanted. The
 * count leads each row instead, which is how the picker has always shown them.
 */

/** One stroke count and how many radicals are written in it. */
export type RadicalStrokeCount = { strokes: number; count: number };

export function radicalStrokeCounts(groups: readonly RadicalGroup[]): RadicalStrokeCount[] {
  return groups
    .map((group) => ({ strokes: group.strokes, count: group.radicals.length }))
    .sort((left, right) => left.strokes - right.strokes);
}

/** Every group, in stroke order, which is the whole page. */
export function orderedGroups(groups: readonly RadicalGroup[]): RadicalGroup[] {
  return [...groups].sort((left, right) => left.strokes - right.strokes);
}

/** How many radicals are on the page, for the line that says so. */
export function radicalsShown(groups: readonly RadicalGroup[]): number {
  return groups.reduce((running, group) => running + group.radicals.length, 0);
}

/**
 * The page's own address.
 *
 * The picked parts and, once there are answers to narrow, how many strokes
 * they take. Both are in the address for the same reason: "the 17-stroke
 * kanji with a mouth" is a thing to send to somebody, from either direction.
 *
 * A stroke count with no parts is dropped rather than kept, because there is
 * nothing for it to narrow - the page has no answers until a part is picked.
 */
export function radicalsHref(
  input: { parts?: readonly string[]; strokes?: number | null; sources?: readonly KanjiSource[] } = {},
): string {
  const parts = input.parts ?? [];
  if (parts.length === 0) return "/radicals";

  const params = new URLSearchParams();
  params.set(RADICAL_BROWSER_PARAMS.parts, parts.join(""));
  if (typeof input.strokes === "number") params.set(RADICAL_BROWSER_PARAMS.strokes, String(input.strokes));
  if (input.sources && input.sources.length > 0) {
    params.set(RADICAL_BROWSER_PARAMS.sources, writeSources(input.sources));
  }
  return `/radicals?${params.toString()}`;
}

/**
 * The stroke count a reader has narrowed to, or null for all of them.
 *
 * Null rather than zero: "every count" is a real answer and the commonest
 * one, and a zero would sort into the chips as though it were a count.
 */
export function readStrokes(value: string | string[] | undefined): number | null {
  const raw = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(raw) && raw > 0 && raw < 100 ? raw : null;
}

/**
 * The radicals a reader has picked, in the order the address gives them.
 *
 * One character each and no separator: a radical is a single character, the
 * query is short, and a `+` in a URL is a space often enough that it is not
 * worth the argument.
 */
export function readParts(value: string | string[] | undefined): string[] {
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined ? [] : [...new Set([...first.trim()])].filter((part) => part.trim().length > 0);
}

/** Adding or removing one radical, which is what clicking one does. */
export function togglePart(parts: readonly string[], radical: string): string[] {
  return parts.includes(radical) ? parts.filter((part) => part !== radical) : [...parts, radical];
}

/**
 * Which chip on the stroke bar is lit.
 *
 * The bar never leaves once a part is picked. It used to go when the parts
 * left a single count, so it appeared and vanished as a member clicked and
 * the kanji moved under them. John: "show Any and the stroke value that is
 * remaining and have that pre-selected." A lone count is the answer, so it is
 * drawn lit and Any is not; with more than one, the member's pick or Any.
 */
export function strokeBarState(
  choices: readonly { strokes: number }[],
  picked: number | null,
): { anyOn: boolean; isOn: (strokes: number) => boolean } {
  const only = choices.length === 1 ? choices[0]!.strokes : null;
  return {
    anyOn: only === null && picked === null,
    isOn: (strokes) => strokes === only || strokes === picked,
  };
}
