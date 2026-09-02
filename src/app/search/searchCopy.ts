import type { LookbackId } from "@/lib/moneyHistory";
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
export const SEARCH_EXAMPLES = ["pencil", "日", "えんぴつ", "Heisei 3", "1500円"] as const;

/**
 * What each computed answer calls itself.
 *
 * A number on its own would be a riddle - the label is what says the 1991 is a
 * year rather than a result count, and which question it answers.
 */
export const SEARCH_ANSWER_COPY: Record<SearchAnswerKind, string> = {
  [SEARCH_ANSWER_KINDS.era]: "Japanese era",
  /* Not "In yen": the same row answers a yen amount in dollars. */
  [SEARCH_ANSWER_KINDS.currency]: "Currency",
} as const;

/**
 * What an answer says about where its numbers came from.
 *
 * Exchange rates are published once a working day, so the day is part of the
 * answer rather than a footnote: a rate quoted with no date reads as live, and
 * on a Sunday it would be two days old.
 */
export const SEARCH_ANSWER_SOURCE_COPY = {
  ratesFrom: (source: string, day: string) => `${source} rates · ${day}`,
} as const;

/**
 * How far back each row of the money history reaches.
 *
 * Written out rather than computed from the number of days, because "180 days"
 * and "a year" are how somebody says them, and "365 days ago" is not.
 */
export const SEARCH_ANSWER_HISTORY_COPY: Record<LookbackId, string> = {
  d180: "180 days ago",
  y1: "1 year ago",
  y5: "5 years ago",
  y10: "10 years ago",
  y20: "20 years ago",
} as const;

/**
 * The heading over the history, and the note that says what it is.
 *
 * The note earns its line twice over: an average and a single day's rate are
 * different claims, and a percentage with no direction stated is a coin toss
 * for the reader.
 */
export const SEARCH_ANSWER_HISTORY_LABELS = {
  heading: "What the same amount was worth",
  /* Names the unheaded first column for a screen reader reading across a row. */
  whenColumn: "How far back",
  note: (days: number) =>
    `Each point averages the ${days} days of published rates before it. The percentage is the change from then to now.`,
} as const;
