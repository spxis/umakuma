import { LIST_ITEM_KINDS, type ListItemKind } from "@/lib/domainConstants";
import { listItemId, type StudyListItemRef } from "@/lib/studyListRules";

/**
 * Taking a word apart into the kanji it is written with.
 *
 * A member saves 成功 to their week's list and then wants 成 and 功 on it too -
 * the word is what they met, the characters are what they have to learn - and
 * the only way to do that was to find each one in an explorer and add it by
 * hand. Splitting is that, in one press: the kanji inside the chosen words,
 * less the ones the list already holds.
 *
 * The characters of the word are the answer, not WaniKani's component list.
 * They agree wherever WaniKani teaches the word, and where it does not - a
 * word from a member's own library, a paste from a book - the characters are
 * all there is, and they are right.
 */

/** One han character: the test the list rules already use to tell a kanji from a word. */
const HAN = /^\p{Script=Han}$/u;

/** The kanji inside these words, in the order they are written, without repeats. */
export function kanjiInsideWords(words: Iterable<string>): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    for (const character of word) {
      if (!HAN.test(character) || seen.has(character)) continue;
      seen.add(character);
      found.push(character);
    }
  }

  return found;
}

/**
 * What splitting would actually add.
 *
 * A word made only of kanji the list already holds adds nothing, and the
 * button says so rather than reporting a save that changed nothing. Okurigana
 * drops out on its own: 借りる contributes 借 and neither り nor る.
 */
export function kanjiToAddFromWords(
  words: Iterable<string>,
  existing: readonly StudyListItemRef[],
): StudyListItemRef[] {
  const already = new Set(existing.map(listItemId));
  return kanjiInsideWords(words)
    .map((key): StudyListItemRef => ({ kind: LIST_ITEM_KINDS.kanji as ListItemKind, key }))
    .filter((item) => !already.has(listItemId(item)));
}
