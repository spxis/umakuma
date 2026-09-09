/** Copy for the stroke browser, in one map for the locale layer. */
export const STROKE_BROWSER_COPY = {
  title: "Strokes",
  /* "Every kanji" was true of a dictionary dump of ten thousand characters,
     most of which the curriculum never teaches and 75 of which were radicals
     wearing a KANJI pill. The page shows the kanji we teach now, and says so. */
  subtitle: "Every kanji we teach, by how many strokes it takes to write.",
  heading: "How many strokes?",
  blurb: "Choose a count to see the kanji written in it, commonest first.",
  countLabel: (strokes: number) => `${strokes} strokes`,
  countLabelOne: "1 stroke",
  commonOnly: "Common only",
  commonHint: "The ones a newspaper uses.",
  showingAll: (count: number, noun = "kanji") => `${count} ${noun}`,
  showingCommon: (count: number, total: number) => `${count} common of ${total}`,
  /* With a part picked, the line has to follow the filter: a header reading
     "49 kanji" over a page of seven is the count saying one thing and the
     page another. */
  showingParts: (count: number, total: number, noun = "kanji") => `${count} of ${total} ${noun}`,
  empty: "No kanji are written in that many strokes.",
} as const;

/**
 * The two things these pages can show, and the word for each.
 *
 * Radicals are off by default. John, when the pages were built from KANJIDIC
 * and six of the eight one-stroke entries were components wearing a KANJI
 * pill: "if it's a radical, then it should not show up in the strokes." They
 * are back because he later asked for them with their own colour and a filter
 * - as something a reader turns on.
 */
export const STROKE_TYPE_COPY = {
  label: "Show",
  all: "Both",
  kanji: "Kanji",
  radical: "Radicals",
  allTitle: "Kanji and radicals together, each character once",
  kanjiTitle: "Only the kanji the curriculum teaches",
  radicalTitle: "Only the 253 radicals a character is built from",
} as const;

/* What the tally calls what it is counting. "32 kanji" over a page that is
   half radicals is the same wrong number the type filter exists to prevent,
   said in words instead of digits. */
export const STROKE_TYPE_NOUNS = {
  all: "characters",
  kanji: "kanji",
  radical: "radicals",
} as const;
