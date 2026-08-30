/** Copy for the printable tracing sheet. */
export const PRACTICE_SHEET_COPY = {
  heading: "Writing practice",
  subtitle: "Copy the first square, trace the faint ones, then write the rest yourself",
  print: "Print",
  back: "Back to grades",
  gradeLabel: "Grade",
  stroke: "stroke",
  strokes: "strokes",
  empty: "No kanji for that grade.",
  credit: "Stroke shapes from KanjiVG (CC BY-SA 3.0)",
  perPage: "Characters",
} as const;

/**
 * How many faint squares follow the solid one.
 *
 * Three tracings then four blanks fills an eight-square row, which is the
 * shape of a Japanese practice book page and fits A4 without shrinking the
 * squares below something a child can write inside.
 */
export const TRACE_CELLS_PER_ROW = 3;

/** Characters per printed sheet, so a grade splits into predictable pages. */
export const PRACTICE_PAGE_SIZE = 20;
