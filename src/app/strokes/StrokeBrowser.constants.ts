/** Copy for the stroke browser, in one map for the locale layer. */
export const STROKE_BROWSER_COPY = {
  title: "Strokes",
  subtitle: "Every kanji, by how many strokes it takes to write.",
  heading: "How many strokes?",
  blurb: "Choose a count to see the kanji written in it, commonest first.",
  countLabel: (strokes: number) => `${strokes} strokes`,
  countLabelOne: "1 stroke",
  commonOnly: "Common only",
  commonHint: "The ones a newspaper uses.",
  showingAll: (count: number) => `${count} kanji`,
  showingCommon: (count: number, total: number) => `${count} common of ${total}`,
  empty: "No kanji are written in that many strokes.",
  pick: "Pick a stroke count above.",
} as const;
