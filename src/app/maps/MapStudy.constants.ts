/** Copy for the map study page, in one map for the locale layer. */
export const MAP_STUDY_COPY = {
  title: "Maps",
  subtitle: "Learn a country region by region.",
  countryLabel: "Country",
  regionsLabel: "Regions",
  hint: "Point at a region to see its name; choose one to read about it.",
  hintTouch: "Tap a region to read about it.",
  close: "Close",
  writtenWith: "Written with",
  neighbours: "Borders",
  readingLabel: "reading",
  /** "Map of Japan, by prefecture" */
  mapLabel: (country: string, division: string) => `Map of ${country}, by ${division}`,
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Fit",
  panHint: "Drag, or use the arrow keys",
} as const;

/** The map keeps this much of the viewport so the whole country reads at once. */
export const MAP_STUDY_HEIGHT = "h-[52vh] min-h-72 lg:h-[64vh]";

/** The map canvas itself, which is focusable so it can be driven by keyboard. */
export const MAP_ZOOM_COPY = {
  canvasLabel: "Map. Arrow keys move around, plus and minus zoom, zero fits the country.",
} as const;

/** Marking a region, in one map for the locale layer. */
export const MAP_MARK_COPY = {
  heading: "What do you make of it?",
  status: { known: "I know it", practice: "Needs practice" },
  visited: "I've been here",
  signedOut: "Sign in to mark the places you know.",
  failed: "Could not save that.",
  /* The line above the map, once anything has been said about the country. */
  tally: (known: number, practice: number, visited: number, total: number) =>
    `${known} of ${total} known · ${practice} to practise · ${visited} visited`,
} as const;

/** The shape drawn on its own at the top of the panel. */
/** Copy for the directory the panel shows while nothing is chosen. */
export const MAP_DIRECTORY_COPY = {
  /** "All 47 prefectures" */
  heading: (count: number, plural: string) => `All ${count} ${plural}`,
  hint: "Point at one to find it on the map; choose one to read about it.",
} as const;

export const MAP_SHAPE_COPY = { caption: (name: string) => `The shape of ${name}, with its neighbours in outline.` } as const;

/**
 * How much wider than tall the region's own frame is.
 *
 * A number rather than a Tailwind class because the window drawn into it is
 * cut to the same shape: the frame's proportions have to be a thing the
 * framing code can read, or the two drift and the map fills the difference
 * with whatever country is next door. Two and a half keeps the height the
 * panel had while the region was drawn small in it.
 */
export const MAP_SHAPE_FRAME_ASPECT = 2.5;
