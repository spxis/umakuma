import { SEARCH_ANSWER_KINDS, type SearchAnswerKind } from "@/lib/searchAnswers";

/** Copy for the global search page, in one map for the locale layer. */
export const SEARCH_PAGE_COPY = {
  heading: "Search",
  placeholder: "Search kanji, meaning, reading, or romaji",
  submit: "Search",
  clear: "Clear the search",
  allSources: "All",
  seeAllInKind: (rest: number) => `${rest} more`,
  filterKinds: "Show",
  filterSources: "From",
  emptyPrompt: "Search every catalogue at once — WaniKani, JLPT and School Grades.",
  noResults: "Nothing matched that search.",
  noResultsHint: "Try an English meaning, a kanji, or a kana reading.",
  noResultsFiltered: "Everything that matched is behind a filter you turned off.",
  clearFilters: "Show everything",
  resultsFor: "Results for",
  hit: "result",
  hits: "results",
  backHome: "Back to UmaKuma",
  examples: "Try",
  suggestSearching: "Searching…",
  suggestSeeAll: "See all",
  suggestMore: "Loading more…",
  recentHeading: "Recent items",
  recentClear: "Clear",
  recentForget: "Forget",
  loadMore: "Show more results",
  loadingMore: "Loading more results…",
  endOfResults: "That is every match.",
} as const;

/** Seeded examples on the empty state; one per source, to show the range. */
export const SEARCH_EXAMPLES = ["pencil", "日", "えんぴつ", "water", "Heisei 3"] as const;

/**
 * What each computed answer calls itself.
 *
 * A number on its own would be a riddle - the label is what says the 1991 is a
 * year rather than a result count, and which question it answers.
 */
export const SEARCH_ANSWER_COPY: Record<SearchAnswerKind, string> = {
  [SEARCH_ANSWER_KINDS.era]: "Japanese era",
} as const;
