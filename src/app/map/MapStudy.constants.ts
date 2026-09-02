/** Copy for the map study page, in one map for the locale layer. */
export const MAP_STUDY_COPY = {
  title: "Map",
  subtitle: "Learn a country region by region.",
  countryLabel: "Country",
  regionsLabel: "Regions",
  hint: "Point at a region to see its name; choose one to read about it.",
  hintTouch: "Tap a region to read about it.",
  nothingChosen: "Nothing chosen yet",
  nothingChosenBody: "Choose a region on the map, or from the list under it.",
  close: "Close",
  writtenWith: "Written with",
  neighbours: "Borders",
  readingLabel: "reading",
  /** "Map of Japan, by prefecture" */
  mapLabel: (country: string, division: string) => `Map of ${country}, by ${division}`,
} as const;

/** The map keeps this much of the viewport so the whole country reads at once. */
export const MAP_STUDY_HEIGHT = "h-[52vh] min-h-72 lg:h-[64vh]";
