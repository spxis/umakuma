/**
 * Which words an item chip carries beside its glyph.
 *
 * The chips printed both at once - `キ · cape`, `しゅく · Lodging` - and
 * nobody had chosen that: the control was on or off, and "on" meant
 * everything it knew. Reading and meaning are two different questions, and a
 * member reading a page wants one of them at a time.
 *
 * Four states. Both came back by request a release later: the objection was
 * never to seeing the pair, it was to having no say in it, and a member who
 * wants `しゅく / Lodging` on every chip should be able to ask for it rather
 * than hover for the half they are missing.
 *
 * Pure, and deliberately not a hook: the selector is called during a server
 * render as well as a client one, and unit-testing the choice should not need
 * a DOM.
 */
export const PILL_WORD_MODES = {
  off: "off",
  reading: "reading",
  english: "english",
  both: "both",
} as const;

export type PillWordMode = (typeof PILL_WORD_MODES)[keyof typeof PILL_WORD_MODES];

export const PILL_WORD_MODE_VALUES = Object.values(PILL_WORD_MODES);

/** Where the choice is remembered, per browser. */
export const PILL_WORDS_STORAGE_KEY = "umakuma:pill-words";

/**
 * English to begin with.
 *
 * The old on-by-default was argued for as "a learner is better served by being
 * told what a character is than by having to hover it", and what it is is the
 * meaning. The reading is the thing being learned rather than the thing that
 * makes a strange character legible, so it is one press away instead.
 */
export const DEFAULT_PILL_WORD_MODE: PillWordMode = PILL_WORD_MODES.english;

export function isPillWordMode(value: string): value is PillWordMode {
  return (PILL_WORD_MODE_VALUES as string[]).includes(value);
}

/** Reading first, then the meaning, the way the both mode reads them out. */
const PAIR_JOINER = " / ";

/**
 * The words this chip shows, or null for the glyph alone.
 *
 * Each mode falls back to the word the chip actually has. A radical WaniKani
 * draws has a name and no reading at all, so asking for readings would empty
 * a whole row of them - a blank chip reads as a page that broke, and the
 * member asked to see less, not to see nothing. Both falls back the same way,
 * to whichever half exists, rather than printing a joiner with nothing on one
 * side of it.
 */
export function pillWords(
  mode: PillWordMode,
  reading: string | null | undefined,
  meaning: string | null | undefined,
): string | null {
  if (mode === PILL_WORD_MODES.off) return null;
  if (mode === PILL_WORD_MODES.both) return pillWordsTitle(reading, meaning);
  const wanted = mode === PILL_WORD_MODES.reading ? reading : meaning;
  const other = mode === PILL_WORD_MODES.reading ? meaning : reading;
  return trimmed(wanted) ?? trimmed(other);
}

/**
 * Both halves, whatever the mode.
 *
 * The title is the escape hatch the other three modes lean on: hiding a word
 * costs a hover, not the fact. It is the same function the both mode draws
 * with, so what a member sees when they ask for the pair and what they get on
 * a hover cannot drift into two formats.
 */
export function pillWordsTitle(
  reading: string | null | undefined,
  meaning: string | null | undefined,
): string | null {
  const parts = [trimmed(reading), trimmed(meaning)].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(PAIR_JOINER) : null;
}

function trimmed(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
