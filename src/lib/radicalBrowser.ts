import { RADICAL_BROWSER_PARAMS } from "./radicalBrowserParams";
import type { RadicalGroup } from "./radicalSearch";

/**
 * The radicals, as a page rather than as a picker.
 *
 * The picker in search asks "which kanji has these parts" and lives inside a
 * dropdown; this asks "what are the parts" and is a page you can send someone.
 * They read the same index and answer different questions, which is why the
 * grouping and the address live here and not in the picker.
 */

/** One stroke count and how many radicals are written in it. */
export type RadicalStrokeCount = { strokes: number; count: number };

export function radicalStrokeCounts(groups: readonly RadicalGroup[]): RadicalStrokeCount[] {
  return groups
    .map((group) => ({ strokes: group.strokes, count: group.radicals.length }))
    .sort((left, right) => left.strokes - right.strokes);
}

/**
 * The groups a reader asked for.
 *
 * `null` is everything, which is the page's own default: there are 253
 * radicals in all, so the whole set fits on one screen and a reader arriving
 * with no question in mind should see them rather than a prompt.
 */
export function groupsForStrokes(
  groups: readonly RadicalGroup[],
  strokes: number | null,
): RadicalGroup[] {
  const ordered = [...groups].sort((left, right) => left.strokes - right.strokes);
  return strokes === null ? ordered : ordered.filter((group) => group.strokes === strokes);
}

/** How many radicals are on the page, for the line that says so. */
export function radicalsShown(groups: readonly RadicalGroup[]): number {
  return groups.reduce((running, group) => running + group.radicals.length, 0);
}

/**
 * The page's own address.
 *
 * The stroke filter and the chosen parts are both in the query, so a reader
 * who has narrowed to "three strokes, and I have picked 水" can send exactly
 * that. Defaults are left out, so the plain page is `/radicals`.
 */
export function radicalsHref(input: {
  strokes?: number | null;
  parts?: readonly string[];
} = {}): string {
  const parts: string[] = [];
  if (typeof input.strokes === "number") parts.push(`${RADICAL_BROWSER_PARAMS.strokes}=${input.strokes}`);
  if (input.parts && input.parts.length > 0) {
    parts.push(`${RADICAL_BROWSER_PARAMS.parts}=${encodeURIComponent(input.parts.join(""))}`);
  }
  return parts.length > 0 ? `/radicals?${parts.join("&")}` : "/radicals";
}

/** The stroke count asked for, or null for all of them. */
export function readStrokes(value: string | string[] | undefined, allowed: readonly number[]): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined) return null;
  const parsed = Number.parseInt(first, 10);
  return allowed.includes(parsed) ? parsed : null;
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
