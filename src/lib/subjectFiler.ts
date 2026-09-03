import { isCatalogSubjectId, LIST_ITEM_KINDS, SUBJECT_TYPES } from "./domainConstants";
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
export type FilerTags = { favorite: boolean; trouble: boolean; burned: boolean };

export const NO_TAGS: FilerTags = { favorite: false, trouble: false, burned: false };

/**
 * WaniKani's id for the subject, or null where there is not really one.
 *
 * Several surfaces give an item WaniKani never taught a negative stand-in id,
 * because React needs a stable key and a selection needs something to hold -
 * `listPageItems` numbers them -1, -2, -3 down the page. Those are page
 * bookkeeping, not subject ids, and sending one on means asking the API about
 * subject -1: the tag route answers 400, and the list route rejects the whole
 * PATCH, so a single home-made item on a list would stop *every* filing change
 * to that list from saving.
 */
export function catalogId(hit: FilerHit): number | null {
  return isCatalogSubjectId(hit.subjectId) ? hit.subjectId : null;
}

/** Whether the row can be tagged as trouble or a favourite. */
export function canTag(hit: FilerHit): boolean {
  return catalogId(hit) !== null;
}

/** The row as a list item, or null where it has nothing to be named by. */
export function itemOf(hit: FilerHit): StudyListItemRef | null {
  const subjectId = catalogId(hit);
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
  /* A stand-in id would make the tag route answer 400 for the whole batch. */
  return [...new Set(hits.flatMap((hit) => {
    const id = catalogId(hit);
    return id === null ? [] : [id];
  }))];
}

/**
 * The filing hit for a subject page.
 *
 * The public pages hold one subject rather than a list of results, and they
 * hold it in the catalogue's own shape. Reading the hit out of that shape in
 * one place keeps the three pages - kanji, word, radical - filing the same
 * thing the search rows file: a word as a word, a radical by its name, and a
 * kanji by its character, each carrying the catalogue's id where there is one
 * so the trouble and favourite marks work too.
 */
/**
 * A WaniKani subject from an explorer queue, as the filer sees it.
 *
 * These carry a real catalogue id, so they can be tagged as well as listed -
 * which is why the explorers pass `marks="lists"`: the tag buttons are already
 * on the row and inside the card's glyph, and a second pair beside them would
 * be two controls for one thing.
 *
 * No slug: a drawn radical has none here, and `itemOf` returns null for it
 * rather than putting a nameless item on somebody's list.
 */
export function levelItemHit(item: {
  subjectId: number;
  subjectType?: string;
  characters: string;
}): FilerHit {
  return {
    subjectType: item.subjectType ?? SUBJECT_TYPES.kanji,
    glyph: item.characters,
    slug: null,
    subjectId: item.subjectId,
  };
}

export function subjectPageHit(subject: {
  subjectType: string;
  characters?: string | null;
  slug?: string | null;
  subjectId?: number | null;
}): FilerHit {
  return {
    subjectType: subject.subjectType,
    glyph: subject.characters?.trim() ?? "",
    slug: subject.slug?.trim() || null,
    subjectId: typeof subject.subjectId === "number" ? subject.subjectId : null,
  };
}
