import { STUDY_TAGS } from "@/lib/domainConstants";
import { LIST_KEY_PARAM, listSlug } from "@/lib/studyListRules";
import {
  PRACTICE_SOURCES,
  isPracticeSource,
  practiceSourceHasLevels,
  practiceSourceHasSlug,
  type PracticeSource,
} from "@/lib/practiceSourceKinds";


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
  /**
   * Whose list it is, when it is not the reader's own.
   *
   * A sheet is built at the reader's address, because that is where their
   * options and their print settings live. So a list belonging to somebody
   * else has to say whose it is in the path - `/practice/list/john/week-1` -
   * rather than being looked up on the reader's own shelf, where "Week 1"
   * means a different list entirely. Left off, it is the reader's own.
   */
  owner?: string | null;
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

  const [source, ...rest] = parts;
  if (!source || !isPracticeSource(source)) return "invalid";

  /*
   * A saved list is named rather than numbered, and may name whose it is:
   * `/practice/list/week-1` is the reader's own, `/practice/list/john/week-1`
   * is John's. The owner is a path segment rather than a parameter because it
   * is part of which list this is, not part of how the sheet is printed.
   */
  if (practiceSourceHasSlug(source)) {
    if (rest.length > 2) return "invalid";
    const [first, second] = rest.map((part) => decodeURIComponent(part));
    if (second !== undefined) return first && second ? { source, level: null, owner: first, slug: second } : "invalid";
    return first ? { source, level: null, slug: first } : "invalid";
  }

  if (rest.length > 1) return "invalid";
  const [level] = rest;

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
  if (target.slug) {
    const owner = target.owner ? `/${encodeURIComponent(target.owner)}` : "";
    return `${base}/${target.source}${owner}/${encodeURIComponent(target.slug)}`;
  }
  return target.level === null ? `${base}/${target.source}` : `${base}/${target.source}/${target.level}`;
}

/**
 * The worksheet for a list, whichever kind of list it is and whoever owns it.
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
  /**
   * Whose list it is, and the key an unlisted one's link carries, when the
   * reader does not own it. A tagged list is one member's private marks with
   * no shared form at all, so somebody else's is offered no sheet.
   */
  from?: { owner?: string | null; key?: string | null },
): string | null {
  if (!practicePath || list.tag === STUDY_TAGS.burned) return null;
  if (list.tag) {
    if (from?.owner) return null;
    return isPracticeSource(list.tag) ? `${practicePath}/${list.tag}` : null;
  }

  const slug = listSlug(list.name);
  if (!slug) return null;
  const owner = from?.owner ? `/${encodeURIComponent(from.owner)}` : "";
  const key = from?.key ? `?${LIST_KEY_PARAM}=${encodeURIComponent(from.key)}` : "";
  return `${practicePath}/${PRACTICE_SOURCES.list}${owner}/${encodeURIComponent(slug)}${key}`;
}
