/** Copy for the radical picker, in one map for the locale layer. */
export const RADICAL_SEARCH_COPY = {
  /** The control that opens it, and its label for a screen reader. */
  open: "Radicals",
  /** What the word shrinks to on a phone: 部首 is what a radical is called. */
  openGlyph: "部",
  openLabel: "Find a kanji by its radicals",
  heading: "By radical",
  /* Typed, not clicked: the box is the way in now. */
  commandBarLabel: "Find by",
  /* Said once, beside the button, so the typed form is discoverable too. */
  commandBarHint: "or type :rad sun + moon",
  hint: "Pick the parts you can see, or type their names. Each one narrows the list.",
  clear: "Clear",
  smaller: "Smaller radicals",
  larger: "Larger radicals",
  resetSize: "Reset the size",
  /* Marks rather than words: three of them sit in a row a phone shares. */
  smallerMark: "A-",
  largerMark: "A+",
  resetSizeMark: "\u21BA",
  close: "Close",
  pick: "Pick a radical to see the kanji built from it.",
  searching: "Looking…",
  empty: "No kanji uses all of those together.",
  failed: "Could not load the radicals. Try again.",
  matches: (total: number, shown: number) =>
    total === shown ? `${total} kanji` : `${shown} of ${total} kanji`,
  radicalTitle: (radical: string, strokes: number) => `${radical} · ${strokes} strokes`,
  strokeTitle: (strokes: number) => `${strokes} strokes`,
} as const;
