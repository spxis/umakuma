/**
 * Copy for the public subject pages, in one map for the locale layer.
 *
 * One module for the group rather than one per page: the word page and the
 * radical page are the same page over different subjects, and splitting their
 * words in two is how "Meanings" ends up spelled two ways.
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
  foundIn: "Found in",
  examples: "In use",
  notFoundTitle: "Nothing here by that name",
  notFoundWord: "No word is catalogued under that spelling.",
  notFoundRadical: "No radical is catalogued under that name.",
  backToSearch: "Search again",
} as const;
