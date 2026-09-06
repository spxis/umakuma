/**
 * The browser's own furniture on a search box, turned off.
 *
 * A `type="search"` input draws a clear cross of its own, and one carrying a
 * `list` draws a dropdown arrow at its end - which is Chrome telling the
 * reader this is a select. It is not: the suggestions appear as you type and
 * the arrow opens a list nobody asked for, in a shape that exists nowhere else
 * on this site. Both are drawn by us instead, or not at all.
 *
 * One constant rather than a string per field: the list page had the cancel
 * button hidden and the arrow showing, and the grade page had neither, which
 * is how two search boxes end up looking like two different controls.
 */
export const SEARCH_INPUT_CHROME_CLASS =
  "[&::-webkit-search-cancel-button]:hidden [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-list-button]:hidden";
