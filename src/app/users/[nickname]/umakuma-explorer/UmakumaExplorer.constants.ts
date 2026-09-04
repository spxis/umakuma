/**
 * Everything the UmaKuma Explorer says, in one place.
 *
 * Per the repo's localization rule: a feature's copy lives in its own module,
 * so the day an `en-CA` dictionary becomes a real one, this map is already it.
 */
export const UK_EXPLORER_COPY = {
  browseHeading: "Browse the UmaKuma curriculum",
  blurb:
    "A hundred levels, built here. Radicals come before the kanji they build, kanji before the words that use them, and each JLPT level finishes on a level you can point at.",
  search: "Search a kanji, a word or a meaning…",
  levelLabel: "Level",
  jump: "Jump to level",
  radicals: "Radicals",
  kanji: "Kanji",
  vocabulary: "Words",
  noKanji: "Radicals only — the parts before the characters.",
  known: "known by here",
  milestone: (nLevel: number) => `N${nLevel} complete`,
  counts: (radicals: number, kanji: number, words: number) =>
    `${radicals} radicals · ${kanji} kanji · ${words} words`,
  showing: (shown: number, total: number) => `${shown.toLocaleString("en-CA")} of ${total.toLocaleString("en-CA")}`,
  loading: "Reading the curriculum…",
  failed: "Could not read the curriculum. Try again?",
  empty: "Nothing on the ladder matches that.",
  previous: "Previous",
  next: "Next",
  levelsView: "Levels",
  listView: "List",
  allKinds: "All",
  page: (page: number, pages: number) => `${page} / ${pages}`,
} as const;

/** The kinds a member can filter to, in the order a level teaches them. */
export const UK_EXPLORER_KINDS = ["radical", "kanji", "vocabulary"] as const;
