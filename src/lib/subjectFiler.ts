import { LIST_ITEM_KINDS, SUBJECT_TYPES } from "./domainConstants";
import { listItemId, type StudyListItemRef } from "./studyListRules";
import { mergeListItems, withoutListItems } from "@/app/shared/mergeListItems";

/**
 * Filing a search result into the member's lists as it is found.
 *
 * Searching ten kanji and keeping each one meant, for every kanji: open it,
 * find the tag on its page, go back, search the next. This is the other way
 * round - the tags and the saved lists come to the result row - and these are
 * the rules for what a row may be filed as, kept as maths so they can be
 * tested without a browser.
 *
 * Two kinds of list, two rules. Trouble and Favourites are tags on a WaniKani
 * subject, so they need the subject's id, which only rows the catalogue names
 * have. A saved list holds items of any kind, so a row goes in as what it is:
 * a word as a word, never as its kanji.
 */

export type FilerHit = {
  subjectType: string;
  glyph: string;
  slug: string | null;
  /** WaniKani's id for the subject, when the catalogue names it. */
  subjectId?: number | null;
};

export type FilerList = { id: string; name: string; items: StudyListItemRef[] };
export type FilerTags = { favorite: boolean; trouble: boolean };

export const NO_TAGS: FilerTags = { favorite: false, trouble: false };

/** Whether the row can be tagged as trouble or a favourite. */
export function canTag(hit: FilerHit): boolean {
  return typeof hit.subjectId === "number";
}

/** The row as a list item, or null where it has nothing to be named by. */
export function itemOf(hit: FilerHit): StudyListItemRef | null {
  const subjectId = hit.subjectId ?? null;
  if (hit.subjectType === SUBJECT_TYPES.kanji) return { kind: LIST_ITEM_KINDS.kanji, key: hit.glyph, subjectId };
  if (hit.subjectType === SUBJECT_TYPES.vocabulary) return { kind: LIST_ITEM_KINDS.vocabulary, key: hit.glyph, subjectId };
  /* A radical is named by its slug, since a drawn one has no characters. */
  if (hit.subjectType === SUBJECT_TYPES.radical && hit.slug) return { kind: LIST_ITEM_KINDS.radical, key: hit.slug, subjectId };
  return null;
}

/** Whether the row can go on a saved list at all. */
export function canList(hit: FilerHit): boolean {
  return itemOf(hit) !== null;
}

/** Whether the row is already on the list. */
export function listHolds(list: FilerList, hit: FilerHit): boolean {
  const item = itemOf(hit);
  if (!item) return false;
  const id = listItemId(item);
  return list.items.some((held) => listItemId(held) === id);
}

/** The list's items after the row is toggled: added when absent, taken out when there. */
export function itemsAfterToggle(list: FilerList, hit: FilerHit): StudyListItemRef[] {
  const item = itemOf(hit);
  if (!item) return list.items;
  return listHolds(list, hit) ? withoutListItems(list.items, [item]) : mergeListItems(list.items, [item]);
}

/** The subject ids worth asking the tag store about, once each. */
export function taggableIds(hits: FilerHit[]): number[] {
  return [...new Set(hits.flatMap((hit) => (typeof hit.subjectId === "number" ? [hit.subjectId] : [])))];
}
