/** Copy for the one-character practice sheet, in one map for the locale layer. */
export const KANJI_SHEET_COPY = {
  strokeHeading: "How it is written",
  practiceHeading: "Now you",
  /* Named for where it goes; Print is on the sheet itself. */
  worksheet: "Worksheet",
  back: "Back to the character",
  /* Said on screen and hidden on paper: the sheet is the thing being printed. */
  hint: "Print this and copy the character into the empty squares.",
} as const;

/**
 * How many squares of practice a sheet offers.
 *
 * Eight across is the workbook square that survives a photocopy - narrow
 * enough that a page holds a useful number, wide enough for a child's brush.
 * The rows are what fills the rest of the page after the steps, which is the
 * point of the sheet: the steps are the lesson, the squares are the work.
 */
export const KANJI_SHEET_COLUMNS = 8;
export const KANJI_SHEET_PRACTICE_ROWS = 7;
