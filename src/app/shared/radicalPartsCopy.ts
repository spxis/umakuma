/**
 * Copy for the shared radical grid, in one map for the locale layer.
 *
 * It belongs to the grid rather than to either page, because both pages draw
 * the same tiles and a dead end has to say the same thing on each.
 */
export const RADICAL_PARTS_COPY = {
  /* A radical that cannot narrow what is left is dimmed rather than removed. */
  deadEnd: "No remaining kanji have this part",
  strokeTitle: (strokes: number) => (strokes === 1 ? "1 stroke" : `${strokes} strokes`),
  /* The stroke pages' own line, where the grid is the second filter and only
     the parts found at this count are drawn. */
  partsHeading: "Narrow by part",
  partsBlurb: "Pick a part to keep only the kanji that contain it. Anything dimmed would leave nothing.",
  clear: "Clear parts",
} as const;
