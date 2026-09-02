import { SUBJECT_TYPES } from "./domainConstants";
import { mergeListCharacters } from "@/app/shared/mergeListCharacters";

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
 * have. A saved list is a sheet of characters, so it takes the kanji a row is
 * written with - a word contributes its kanji, not its kana, or a sheet of
 * "kanji I keep losing" would fill with つ and り.
 */

export type FilerHit = {
  subjectType: string;
  glyph: string;
  slug: string | null;
  /** WaniKani's id for the subject, when the catalogue names it. */
  subjectId?: number;
};

export type FilerList = { id: string; name: string; characters: string };
export type FilerTags = { favorite: boolean; trouble: boolean };

export const NO_TAGS: FilerTags = { favorite: false, trouble: false };

/** Whether the row can be tagged as trouble or a favourite. */
export function canTag(hit: FilerHit): boolean {
  return typeof hit.subjectId === "number";
}

/** CJK unified ideographs, which is what a saved list is a sheet of. */
const KANJI = /\p{Script=Han}/u;

/** The characters a saved list would take from this row: its kanji, in order. */
export function listCharactersOf(hit: FilerHit): string[] {
  if (hit.subjectType !== SUBJECT_TYPES.kanji && hit.subjectType !== SUBJECT_TYPES.vocabulary) return [];
  const seen = new Set<string>();
  return [...hit.glyph].filter((character) => {
    if (!KANJI.test(character) || seen.has(character)) return false;
    seen.add(character);
    return true;
  });
}

/** Whether the row can go on a saved list at all. */
export function canList(hit: FilerHit): boolean {
  return listCharactersOf(hit).length > 0;
}

/** Whether every kanji of the row is already on the list. */
export function listHolds(list: FilerList, hit: FilerHit): boolean {
  const characters = listCharactersOf(hit);
  if (characters.length === 0) return false;
  const held = new Set([...list.characters]);
  return characters.every((character) => held.has(character));
}

/**
 * The list's characters after the row is toggled: added when any of its kanji
 * is missing, taken out when all of them are there. Order kept, nothing else
 * touched - the member's own sheet is theirs.
 */
export function charactersAfterToggle(list: FilerList, hit: FilerHit): string {
  const characters = listCharactersOf(hit);
  if (listHolds(list, hit)) {
    const drop = new Set(characters);
    return [...list.characters].filter((character) => !drop.has(character)).join("");
  }
  return mergeListCharacters(list.characters, characters);
}

/** The subject ids worth asking the tag store about, once each. */
export function taggableIds(hits: FilerHit[]): number[] {
  return [...new Set(hits.flatMap((hit) => (typeof hit.subjectId === "number" ? [hit.subjectId] : [])))];
}
