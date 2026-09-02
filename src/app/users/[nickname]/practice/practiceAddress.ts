import { STUDY_TAGS } from "@/lib/domainConstants";
import { listSlug } from "@/lib/studyListRules";
import {
  PRACTICE_SOURCES,
  isPracticeSource,
  practiceSourceHasLevels,
  practiceSourceHasSlug,
  type PracticeSource,
} from "@/lib/practiceSourceKinds";

import { PRINT_NOW_PARAM } from "./sheetLink";

/**
 * Where a practice sheet lives.
 *
 * Practice sat under the grades explorer, at `/grades/practice?source=jlpt`,
 * which read as though grades owned it. It never did: it builds sheets from
 * school grades, WaniKani levels, JLPT levels, either tagged list, or a set
 * picked by hand on any surface. It is the thing you do to a collection, not a
 * page belonging to one of them.
 *
 * So it is addressed as what it is: `/practice` to choose, then the collection
 * in the path — `/practice/jlpt/5`, `/practice/grade/2`, `/practice/trouble`,
 * `/practice/list/week-1`. How the sheet is printed (model characters,
 * readings, squares per page) stays in the query, because that is how you are
 * practising rather than what.
 */

export type PracticeTarget = {
  source: PracticeSource;
  /** The level or grade within the source; null for a list, which has none. */
  level: number | null;
  /** The saved list's slug, for the one source named by a name. */
  slug?: string | null;
};

/** What `/practice` on its own means: choose something. */
export const PRACTICE_CHOOSING: PracticeTarget | null = null;

/**
 * The target named by the path, `null` to choose, `"invalid"` for nonsense.
 *
 * A wrong address returns a 404 rather than quietly opening a default sheet,
 * for the same reason `/grades/nonsense` does: a broken link should not look
 * like a working one.
 */
export function parsePracticeTarget(segments: string[] | undefined): PracticeTarget | null | "invalid" {
  const parts = (segments ?? []).filter((part) => part.length > 0);
  if (parts.length === 0) return PRACTICE_CHOOSING;

  const [source, level, ...rest] = parts;
  if (rest.length > 0 || !source || !isPracticeSource(source)) return "invalid";

  /* A saved list is named rather than numbered: /practice/list/week-1. */
  if (practiceSourceHasSlug(source)) {
    const slug = level ? decodeURIComponent(level) : "";
    return slug ? { source, level: null, slug } : "invalid";
  }

  /* A list is the whole set; a level would mean nothing on one. */
  if (!practiceSourceHasLevels(source)) {
    return level === undefined ? { source, level: null } : "invalid";
  }

  if (level === undefined) return "invalid";
  const parsed = Number.parseInt(level, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return "invalid";

  return { source, level: parsed };
}

/** The address of a sheet, or of the chooser when no source is given. */
export function practiceHref(nickname: string, target?: PracticeTarget): string {
  const base = `/users/${encodeURIComponent(nickname)}/practice`;
  if (!target) return base;
  if (target.slug) return `${base}/${target.source}/${encodeURIComponent(target.slug)}`;
  return target.level === null ? `${base}/${target.source}` : `${base}/${target.source}/${target.level}`;
}

/**
 * The worksheet for a list, whichever kind of list it is.
 *
 * Three surfaces want this link - the list's page, its card on the shelf, and
 * the print action beside each - and each of them was building it for itself.
 * The card built a picked sheet with every character of the list in the query,
 * the page offered nothing at all, and neither could say what the other meant.
 *
 * Trouble and Favourites are addressed by their source, since the sheet reads
 * the tags rather than any rows. A saved list is addressed by its name. Burned
 * gets nothing: a sheet for tracing what you already know is not a sheet.
 */
export function listWorksheetHref(
  /** The viewer's own `/practice` base; empty for a visitor, who has none. */
  practicePath: string,
  list: { tag: string | null; name: string },
): string | null {
  if (!practicePath || list.tag === STUDY_TAGS.burned) return null;
  if (list.tag) {
    return isPracticeSource(list.tag) ? `${practicePath}/${list.tag}` : null;
  }

  const slug = listSlug(list.name);
  return slug ? `${practicePath}/${PRACTICE_SOURCES.list}/${encodeURIComponent(slug)}` : null;
}

/** The same sheet, asked to open the print dialog as it arrives. */
export function listPrintHref(practicePath: string, list: { tag: string | null; name: string }): string | null {
  const href = listWorksheetHref(practicePath, list);
  return href ? `${href}?${PRINT_NOW_PARAM}=1` : null;
}
