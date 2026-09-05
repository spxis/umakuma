/** Copy for the radicals page, in one map for the locale layer. */
export const RADICAL_BROWSER_COPY = {
  title: "Radicals",
  subtitle: "The parts kanji are built from, by how many strokes they take.",
  heading: "How many strokes?",
  blurb: "Choose a count to see the radicals written in it, or pick parts to find the kanji that contain them.",
  all: "All",
  countLabel: (strokes: number) => `${strokes} strokes`,
  countLabelOne: "1 stroke",
  showing: (count: number) => `${count} radicals`,
  showingOne: "1 radical",
  /* The second half of the page, which only appears once something is picked. */
  pickedHeading: "Kanji with these parts",
  clear: "Clear",
  pickHint: "Pick a radical to see the kanji built from it. Pick another to narrow.",
  matches: (shown: number, total: number) =>
    shown === total ? `${total} kanji` : `${shown} of ${total} kanji`,
  noMatches: "No kanji in the dictionary have all of those parts.",
  /* A radical that cannot narrow what is left is dimmed rather than removed. */
  deadEnd: "No remaining kanji have this part",
  strokeTitle: (strokes: number) => (strokes === 1 ? "1 stroke" : `${strokes} strokes`),
} as const;

