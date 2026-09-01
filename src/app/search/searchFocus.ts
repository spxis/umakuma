/**
 * The handoff between the search box and the results under it.
 *
 * Arrowing down past the last suggestion should keep going into the results,
 * and arrowing back up off the first result should return to the box. The two
 * live in different trees - the box is a client island inside a server page -
 * so they meet through these ids and attributes rather than through shared
 * state, which would mean making the whole results page a client component to
 * pass one ref.
 *
 * A row is addressed by its column and its place in that column, since the
 * results are laid out in columns by catalogue. A flat index would have to be
 * recomputed every time a column got longer, and every row would move.
 */

export const SEARCH_PAGE_INPUT_ID = "search-page-input";

/** Which column a row is in, counted across the columns actually drawn. */
export const SEARCH_COL_ATTR = "data-search-col";

/** Where the row sits in its own column. */
export const SEARCH_ROW_ATTR = "data-search-row";

/**
 * Marks a row as a result, for tests and for finding one from an event.
 *
 * Kept alongside the two above rather than replaced by them: this one says
 * "this is a result row", which is a different question from where it sits.
 */
export const SEARCH_RESULT_ROW_ATTR = "data-search-result-row";

/**
 * Back to the box, and back on screen with it.
 *
 * The scroll is spelled out rather than left to focus. The results scroll
 * inside their own cards within a page that scrolls too, and coming back from
 * a row forty down left the box focused above the fold with the results still
 * filling the screen - typing went somewhere the reader could not see.
 */
export function focusSearchInput(): void {
  const input = document.getElementById(SEARCH_PAGE_INPUT_ID);
  if (!input) return;
  input.focus();
  input.scrollIntoView({ block: "center" });
}

/** Focuses that cell, and reports whether there was one to focus. */
export function focusSearchCell(column: number, row: number): boolean {
  const cell = document.querySelector<HTMLElement>(
    `[${SEARCH_COL_ATTR}="${column}"][${SEARCH_ROW_ATTR}="${row}"]`,
  );
  if (!cell) return false;
  cell.focus();
  cell.scrollIntoView({ block: "nearest" });
  return true;
}

/** The first result, which is where the box hands off when the arrows leave it. */
export function focusFirstSearchResult(): boolean {
  return focusSearchCell(0, 0);
}
