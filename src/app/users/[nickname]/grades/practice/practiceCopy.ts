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
  pagerLabel: "Pages",
  printName: "Name",
  printDate: "Date",
  pagerTop: "Top",
  pagerBottom: "Bottom",
  pagerBoth: "Both",
  pagerNone: "None",
  sourceLabel: "Practise",
  chooseLabel: "Choose",
  closeChooser: "Done",
  optionsLabel: "Options",
  optionShowModel: "Show the finished character",
  optionShowReadings: "Show readings",
  sizeLabel: "Squares",
  sizeLarge: "L",
  sizeMedium: "M",
  sizeSmall: "S",
  sizeLargeTitle: "Large squares, for a child learning to form the characters",
  sizeMediumTitle: "The standard practice-book square",
  sizeSmallTitle: "Small squares and more of them, for an adult copying at volume",
  modeLabel: "Sheet",
  modeTrace: "Trace",
  modeStrokes: "Stroke order",
  phoneNoticeHeading: "This sheet wants a bigger screen",
  phoneNoticeBody:
    "The squares have to be large enough to write inside, which a phone cannot give. Open this on a tablet or print it. You can keep scrolling if you only want to look.",
  fromGrades: "School grade",
  fromWanikani: "WaniKani level",
  fromJlpt: "JLPT level",
  fromTrouble: "Trouble",
  fromFavourite: "Favourites",
  emptyTagged: "Nothing on that list yet. Tag a kanji as trouble or a favourite and it will appear here.",
} as const;

/**
 * How many faint squares follow the solid one, at the default size.
 *
 * Three tracings then four blanks fills an eight-square row, which is the
 * shape of a Japanese practice book page. A size that fits more squares across
 * offers more of them - see `SHEET_SIZES`.
 */
export const TRACE_CELLS_PER_ROW = 3;

/** Characters per printed sheet, so a grade splits into predictable pages. */
export const PRACTICE_PAGE_SIZE = 20;

/**
 * Squares across a row, and so where a long character wraps.
 *
 * Eight is the practice-book row. A character of more than eight strokes runs
 * onto a second row rather than shrinking every square to fit, because a
 * square too small to write in is no longer a practice square.
 */
export const SHEET_COLUMNS = 8;

/**
 * How big the squares are, which is really a question of who is writing.
 *
 * A child learning to form characters needs a big box and few of them; a
 * university student copying vocabulary wants small boxes and many. The sheet
 * had one size, and it was the child's - so the same page an adult printed
 * gave them six enormous squares and a lot of white paper.
 *
 * Expressed as columns rather than millimetres because the squares divide the
 * printable width: fewer columns is a bigger square, at any paper size, on any
 * screen. Smaller squares also earn an extra tracing repetition, since there is
 * room for one and an adult sheet is about volume.
 */
export const SHEET_SIZES = {
  large: { columns: 6, traceCells: 3 },
  medium: { columns: SHEET_COLUMNS, traceCells: TRACE_CELLS_PER_ROW },
  small: { columns: 10, traceCells: 4 },
} as const;

export type SheetSize = keyof typeof SHEET_SIZES;

/** Largest first, the way a size control reads left to right. */
export const SHEET_SIZE_ORDER = ["large", "medium", "small"] as const;

export const DEFAULT_SHEET_SIZE: SheetSize = "medium";

export function toSheetSize(value: string | null | undefined): SheetSize {
  return value === "large" || value === "small" || value === "medium" ? value : DEFAULT_SHEET_SIZE;
}

/** WaniKani goes to 60, and every level is a legitimate sheet to print. */
export const WANIKANI_MAX_LEVEL = 60;

/** N5 down to N1, in the order a learner climbs them. */
export const JLPT_LEVELS = [5, 4, 3, 2, 1] as const;

/**
 * The four levels the test ran until 2009, and the modern level each matches.
 *
 * Both schemes count down, so old Level 4 is the beginner paper and maps to N5
 * rather than N4. N3 is absent because it did not exist: it was added in 2010
 * to bridge old Levels 3 and 2.
 */
export const JLPT_CLASSIC_LEVELS = [
  { classic: 4, modern: 5 },
  { classic: 3, modern: 4 },
  { classic: 2, modern: 2 },
  { classic: 1, modern: 1 },
] as const;
