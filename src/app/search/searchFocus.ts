/**
 * The handoff between the search box and the results under it.
 *
 * Arrowing down past the last suggestion should keep going into the results,
 * and arrowing back up off the first result should return to the box. The two
 * live in different trees - the box is a client island inside a server page -
 * so they meet through these ids rather than through shared state, which would
 * mean making the whole results page a client component to pass one ref.
 */

export const SEARCH_PAGE_INPUT_ID = "search-page-input";

/** Marks a results row with its index, so the arrows can find its neighbour. */
export const SEARCH_RESULT_ROW_ATTR = "data-search-result-row";

export function focusSearchInput(): void {
  document.getElementById(SEARCH_PAGE_INPUT_ID)?.focus();
}

/** Focuses that row, and reports whether there was one to focus. */
export function focusSearchResultRow(index: number): boolean {
  const row = document.querySelector<HTMLElement>(`[${SEARCH_RESULT_ROW_ATTR}="${index}"]`);
  if (!row) return false;
  row.focus();
  row.scrollIntoView({ block: "nearest" });
  return true;
}
