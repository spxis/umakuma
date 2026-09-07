/**
 * Where the WaniKani board is, for the things that link to it.
 *
 * The board is rendered on the home page - `/leaderboard` holds its components
 * and a redirect, nothing more - so "the WaniKani board" has no address of its
 * own to point at. `/` alone is not it either: the home page opens on a hero,
 * a headline and three summary cards, and a member who clicks the `WK17` in
 * the header wants the table they are a row of, not the top of the site.
 *
 * So the section that holds the table carries the anchor and this names it
 * once, rather than a `"#wanikani-board"` typed out at each end where the two
 * can stop matching without anything failing - a wrong anchor is silent, and
 * lands the reader at the top of the page looking like the link did nothing.
 */
export const WANIKANI_BOARD_ANCHOR = "wanikani-board";

export const WANIKANI_BOARD_HREF = `/#${WANIKANI_BOARD_ANCHOR}`;
