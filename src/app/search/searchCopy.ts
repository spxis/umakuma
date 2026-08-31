/** Copy for the global search page, in one map for the locale layer. */
export const SEARCH_PAGE_COPY = {
  heading: "Search",
  placeholder: "Search kanji, meaning, reading, or romaji",
  submit: "Search",
  allSources: "All",
  emptyPrompt: "Search every catalogue at once — WaniKani, JLPT and School Grades.",
  noResults: "Nothing matched that search.",
  noResultsHint: "Try an English meaning, a kanji, or a kana reading.",
  resultsFor: "Results for",
  hit: "result",
  hits: "results",
  backHome: "Back to UmaKuma",
  examples: "Try",
  suggestSearching: "Searching…",
  suggestSeeAll: "See all",
} as const;

/** Seeded examples on the empty state; one per source, to show the range. */
export const SEARCH_EXAMPLES = ["pencil", "日", "えんぴつ", "water"] as const;
