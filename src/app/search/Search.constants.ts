import type { SearchSource } from "@/lib/globalSearch";

/**
 * The numbers and class strings the search surfaces share.
 *
 * In a module of their own because the page is a server component and the rows
 * are a client one, and a constant imported across that boundary is not a
 * constant: Next hands the server a client reference where the value should
 * be. `COLUMN_PREVIEW` came back as one of those, `slice(0, proxy)` read it as
 * zero, and every column rendered its heading over no rows at all - a page
 * that said "45 more" above nothing. Nothing warned about it; it type-checked
 * and built clean.
 */

/** Source accents, so a row's origin reads before the label does. */
export const SOURCE_TONES: Record<SearchSource, string> = {
  wanikani: "border-sky-300 bg-sky-50 text-sky-700",
  jlpt: "border-emerald-300 bg-emerald-50 text-emerald-700",
  grades: "border-kanji/40 bg-kanji/10 text-kanji",
  /* Muted on purpose: the reference behind the catalogues, not a fourth one. */
  dictionary: "border-line bg-surface-muted text-foreground/60",
};

/** How near the last row the reader gets before the next stretch is asked for. */
export const LOAD_LEAD_ROWS = 3;

/** How many rows a column shows before it hands off to that catalogue on its own. */
export const COLUMN_PREVIEW = 12;

/**
 * Every row that catalogue found, for the column opened on its own.
 *
 * Not unbounded: each catalogue's query is already capped, so this is a ceiling
 * above what any of them can return rather than a promise to render anything.
 */
export const COLUMN_FULL = 500;

/**
 * The card a list of rows lives in.
 *
 * Shared with the recent items, because what follows the results belongs to
 * the same list rather than to a card of its own floating below it.
 */
export const SEARCH_LIST_CARD =
  "overflow-hidden rounded-2xl border border-line bg-surface divide-y divide-line/60";

/**
 * How tall a column may grow before it scrolls inside its own card.
 *
 * A catalogue can answer a common character with seventy rows. Four of those
 * side by side made the page taller than the screen many times over, and the
 * recent items sat below a kilometre of results. Each column scrolls within
 * its card instead, so the filters and everything around them stay put.
 */
export const COLUMN_MAX_HEIGHT = "max-h-[60vh]";
