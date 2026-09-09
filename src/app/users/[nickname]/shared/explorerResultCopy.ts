/** What the results line and its filter chips say, in one place for the locale layer. */
export const EXPLORER_RESULT_COPY = {
  itemsNoun: "items",
  resultsNoun: "results",
  searchChipLabel: (term: string) => `Search: ${term}`,
  searchChipHint: "Showing search matches only. Select to clear the search.",
  clearFilter: "Clear",
} as const;

/**
 * "Showing 1 of 100 items" - the two numbers and the thing being counted.
 *
 * The slash form the study explorer used ("Showing 1/100 items") read as a
 * fraction of one thing rather than a count out of a total, and it was the only
 * one of the three explorers that wrote it that way.
 */
export function explorerShowingText(visible: string, total: string, noun: string): string {
  return `Showing ${visible} of ${total} ${noun}`;
}
