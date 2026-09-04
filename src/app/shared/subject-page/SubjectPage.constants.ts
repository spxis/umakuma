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
  /*
   * The way out to Jisho, on a word's own row.
   *
   * Named for what it does rather than what it looks like: a screen reader
   * reads this and never sees the arrow. Hidden until the row is pointed at or
   * the link is tabbed to, so it stays out of the way of reading and never out
   * of reach of a keyboard.
   */
  lookUpOnJisho: (word: string) => `Look up ${word} on Jisho`,
  foundIn: "Found in",
  examples: "In use",
  heisig: "Heisig",
  /* The one control for the words on every item pill. */
  pillWordsLabel: "Words on item chips",
  pillWordsOff: "Off",
  pillWordsReading: "\u3042",
  pillWordsEnglish: "EN",
  pillWordsBoth: "Both",
  pillWordsOffTitle: "Glyphs only",
  pillWordsReadingTitle: "Readings",
  pillWordsEnglishTitle: "English",
  pillWordsBothTitle: "Reading and English",
  /* The strip under the card, for a reader with no account to file into. */
  filingSignedOut: (label: string) => `Keep ${label} on a list of your own`,
  filingJoin: "Join UmaKuma",
  notFoundTitle: "Nothing here by that name",
  notFoundWord: "No word is catalogued under that spelling.",
  notFoundRadical: "No radical is catalogued under that name.",
  backToSearch: "Search again",
  /*
   * The parts of a subject, each of which has an address of its own. The
   * titles are what a section page is called and what a shared link previews
   * as, so they name the part rather than the page.
   */
  sectionTitles: {
    stroke: "Stroke order",
    parts: "Written with",
    meanings: "Meanings and readings",
    words: "Words",
    related: "Related",
    mnemonics: "Mnemonics",
    examples: "In use",
  },
  sectionBack: (label: string) => `Everything about ${label}`,
  otherSections: "Other parts",
} as const;

/**
 * How many compounds a kanji page lists.
 *
 * 一 appears in hundreds of words. All of them is a page nobody scrolls and
 * three is a tease; twelve is a list that still reads as a list, and it is
 * also what the enrichment stored per character, so the cap and the data agree.
 */
export const WORD_EXAMPLE_LIMIT = 12;
