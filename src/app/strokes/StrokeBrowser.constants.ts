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
  showingAll: (count: number) => `${count} kanji`,
  showingCommon: (count: number, total: number) => `${count} common of ${total}`,
  /* With a part picked, the line has to follow the filter: a header reading
     "49 kanji" over a page of seven is the count saying one thing and the
     page another. */
  showingParts: (count: number, total: number) => `${count} of ${total} kanji`,
  empty: "No kanji are written in that many strokes.",
} as const;
