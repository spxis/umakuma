/**
 * Copy for the public subject pages, in one map for the locale layer.
 *
 * One module for the group rather than one per page: the kanji, word and
 * radical pages are the same page over different subjects, and splitting
 * their words three ways is how "Meanings" ends up spelled three ways.
 */
export const SUBJECT_PAGE_COPY = {
  meanings: "Meanings",
  readings: "Readings",
  level: (level: number) => `Level ${level}`,
  jlpt: (level: number) => `N${level}`,
  meaningNote: "Meaning",
  readingNote: "Reading",
  builtFrom: "Built from",
  usedIn: "Used in",
  looksLike: "Looks like",
  sharesKanji: "Other words with these kanji",
  usedInWords: "Used in words",
  foundIn: "Found in",
  examples: "In use",
  heisig: "Heisig",
  /* The one control for the words on every item pill. */
  pillTextOn: "Text on",
  pillTextOff: "Text off",
  notFoundTitle: "Nothing here by that name",
  notFoundWord: "No word is catalogued under that spelling.",
  notFoundRadical: "No radical is catalogued under that name.",
  backToSearch: "Search again",
} as const;

/**
 * How many compounds a kanji page lists.
 *
 * 一 appears in hundreds of words. All of them is a page nobody scrolls and
 * three is a tease; twelve is a list that still reads as a list, and it is
 * also what the enrichment stored per character, so the cap and the data agree.
 */
export const WORD_EXAMPLE_LIMIT = 12;
