/**
 * What the UmaKuma explorer says, in one map for the locale layer.
 */
export const UK_EXPLORER_COPY = {
  browseHeading: "Browse the UmaKuma curriculum",
  browseBlurb:
    "A hundred levels, built here. Radicals come before the kanji they build, kanji before the words that use them, and each JLPT level finishes on a level you can point at.",
  levelLabel: "Level",
  levelHeading: (level: number) => `UmaKuma level ${level}`,
  levelTally: (radicals: number, kanji: number, words: number) =>
    `${radicals} radicals · ${kanji} kanji · ${words} words`,
  known: (kanji: number) => `${kanji.toLocaleString()} kanji known by here`,
  searchPlaceholder: "Search a kanji, a word or a meaning…",
  searchClear: "Clear",
  searchHits: (shown: number, total: number) =>
    total > shown ? `${shown} of ${total.toLocaleString()} matches` : `${total.toLocaleString()} matches`,
  searchEmpty: "Nothing on the ladder matches that.",
  groupingLabel: "Show",
  all: "All",
  previous: "Previous level",
  next: "Next level",
  jlptAt: (nLevel: number) => `N${nLevel} finishes here`,
  emptySection: "Nothing at this level.",
  yourLevel: (level: number) => `Go to your level, ${level}`,
  /* The shut decades in the level filter. A hundred levels read as ten things
     and open one at a time; see `levelChips.ts`. */
  levelGroup: (start: number, end: number) => `${start}-${end}`,
  openGroup: (start: number, end: number) => `Open levels ${start} to ${end}`,
  /* The published papers. John: "You can link to the articles we have created
     for UmaKuma as they are interesting." */
  papersHeading: "How this curriculum was built",
  papersBlurb:
    "Seven papers on the two ladders — what a level costs, where the JLPT bands and school years finish, and the rules the build is held to. Every figure names the curriculum version it was drawn from.",
  papersLink: "Read the papers",
} as const;

/**
 * What the picker adds to the shared chip, which is very little.
 *
 * It used to spell out five: a base, an on tone, an off tone and a shut-decade
 * tone, all four of which were `FILTER_CHIP_CLASS`, `filterChipTone` and
 * `filterChipGroupTone` written again by hand - which is how the row ended up
 * the one on the site whose chips carried no count. Only the milestone is
 * genuinely this surface's own.
 */
export const UK_LEVEL_CHIP = {
  /* A hundred chips of digits, so the numbers line up as the decade changes. */
  figures: "tabular-nums",
  /* A level that finishes a JLPT band is worth finding in a row of a hundred. */
  milestone: "border-teal-400 bg-teal-50 text-teal-800 hover:bg-teal-100",
} as const;

export const UK_VIEW_MODE_STORAGE_KEY = "wr:umakuma:view-mode";
