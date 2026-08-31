/**
 * The outer padding every user-scoped page uses.
 *
 * These pages are siblings behind the same sub-nav - Study, the two explorers,
 * Grades, Practice - and each had grown its own wrapper. The sub-nav sat at
 * 66px on the explorers, 74px on Grades and 95px on Practice, so moving
 * between them nudged the whole header down and back up again.
 *
 * Width is a separate decision - see `PAGE_WIDTH` below - because it depends on
 * what a page holds. The vertical rhythm does not: it has to agree everywhere,
 * because that is what the eye tracks across a tab change.
 */
export const PAGE_SHELL_PADDING = "px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8";

/**
 * How wide a member page runs, decided by what is on it rather than per page.
 *
 * Four pages ran edge to edge, Grades sat at 6xl and Profile at 4xl, so moving
 * between sibling tabs changed the width of the site. But one width for
 * everything is also wrong: a filter row with sixty level chips wants the room,
 * and a form field 1,400 pixels wide is unusable.
 *
 * So two rules, chosen by content:
 *
 * - `WIDE` for surfaces made of grids, filters and tables - Study, Game, the
 *   explorers, History, Libraries, Grades. These earn the width.
 * - `READING` for a page that is mostly prose or a single column of fields -
 *   Profile, and the welcome flow. Text set too wide is harder to read, not
 *   easier.
 *
 * Navigation always spans the full width even on a reading page: sharing the
 * narrow column is what wrapped Practice's header onto a third line.
 */
export const PAGE_WIDTH = {
  wide: "w-full",
  reading: "mx-auto w-full max-w-4xl",
} as const;
