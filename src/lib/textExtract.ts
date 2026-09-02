import { LIST_ITEM_KINDS } from "./domainConstants";
import type { StudyListItemRef } from "./studyListRules";

/**
 * Pulling a list out of pasted text.
 *
 * Somebody pastes a page of a book, a lesson handout, a chat message, and
 * wants the kanji and the words out of it. Two things follow from "somebody
 * pastes anything".
 *
 * The first is safety. The text is never stored, never rendered as anything
 * but text, and never trusted for its length: it is cut to a cap before any
 * work is done, control characters are dropped, and what comes back is not
 * the text but items the catalogue recognised - a fixed shape of kinds and
 * keys. Nothing a paste can contain survives that as anything but a kanji or
 * a word we already knew about.
 *
 * The second is the reading itself, which is done here as maths so it can be
 * tested: the runs of Japanese are found, the words in them are matched
 * longest-first against the catalogue, and every kanji is taken whether it
 * belongs to a matched word or not.
 */

export const TEXT_IMPORT_LIMITS = {
  /** A chapter is about this long. Past it the paste is cut, and says so. */
  characters: 20_000,
  /** The longest run treated as one word; WaniKani's longest entries are shorter. */
  wordLength: 8,
  /** How many distinct candidates a paste may ask the catalogue about. */
  candidates: 4_000,
} as const;

const HAN = /\p{Script=Han}/u;
const JAPANESE_RUN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]+/gu;
/* Anything a terminal or a parser might act on, and everything invisible. */
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

export type ExtractInput = { text: string; known?: ReadonlySet<string> };

export type ExtractResult = {
  items: StudyListItemRef[];
  /** What the paste held, for the line that says what happened. */
  stats: { characters: number; truncated: boolean; kanji: number; words: number };
};

/** The text as it will be read: cut to the cap, stripped of what cannot be read. */
export function sanitizePastedText(raw: string): { text: string; truncated: boolean } {
  const cleaned = raw.replace(CONTROL, " ");
  const characters = Array.from(cleaned);
  const truncated = characters.length > TEXT_IMPORT_LIMITS.characters;
  return { text: truncated ? characters.slice(0, TEXT_IMPORT_LIMITS.characters).join("") : cleaned, truncated };
}

/**
 * Every substring the catalogue might know, so one question can be asked
 * about the whole paste. Capped, because a long paste of Japanese has more
 * substrings than anybody needs to look up.
 */
export function wordCandidates(text: string): string[] {
  const candidates = new Set<string>();
  for (const [run] of text.matchAll(JAPANESE_RUN)) {
    const characters = Array.from(run);
    for (let start = 0; start < characters.length; start += 1) {
      for (let length = TEXT_IMPORT_LIMITS.wordLength; length >= 2; length -= 1) {
        if (start + length > characters.length) continue;
        candidates.add(characters.slice(start, start + length).join(""));
        if (candidates.size >= TEXT_IMPORT_LIMITS.candidates) return [...candidates];
      }
    }
  }
  return [...candidates];
}

/**
 * The list a paste comes to: the words the catalogue knows, longest match
 * first, and every kanji in the text.
 *
 * Both, rather than one or the other. A handout of vocabulary is wanted as
 * words; the same handout is also the kanji a learner has to write, and which
 * of the two somebody meant is not for this to decide - they can take out
 * what they did not want before saving, which is the whole point of showing
 * the result first.
 */
export function extractListItems({ text, known = new Set<string>() }: ExtractInput): ExtractResult {
  const { text: safe, truncated } = sanitizePastedText(text);
  const words: string[] = [];
  const seenWords = new Set<string>();

  for (const [run] of safe.matchAll(JAPANESE_RUN)) {
    const characters = Array.from(run);
    let index = 0;
    while (index < characters.length) {
      let matched = 0;
      for (let length = Math.min(TEXT_IMPORT_LIMITS.wordLength, characters.length - index); length >= 2; length -= 1) {
        const candidate = characters.slice(index, index + length).join("");
        if (known.has(candidate)) {
          matched = length;
          if (!seenWords.has(candidate)) {
            seenWords.add(candidate);
            words.push(candidate);
          }
          break;
        }
      }
      index += matched || 1;
    }
  }

  const kanji: string[] = [];
  const seenKanji = new Set<string>();
  for (const character of Array.from(safe)) {
    if (!HAN.test(character) || seenKanji.has(character)) continue;
    seenKanji.add(character);
    kanji.push(character);
  }

  const items: StudyListItemRef[] = [
    ...words.map((key) => ({ kind: LIST_ITEM_KINDS.vocabulary, key, subjectId: null })),
    ...kanji.map((key) => ({ kind: LIST_ITEM_KINDS.kanji, key, subjectId: null })),
  ];

  return {
    items,
    stats: { characters: Array.from(safe).length, truncated, kanji: kanji.length, words: words.length },
  };
}
