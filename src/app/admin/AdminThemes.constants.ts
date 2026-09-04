/** Copy for the theme browser, in one module for the locale layer. */
export const ADMIN_THEMES_COPY = {
  label: "Presentation",
  title: "SRS themes",
  description:
    "WaniKani names its stages Apprentice, Guru, Master, Enlightened and Burned, and that is the only vocabulary a learner gets. A member picks from these instead, and can change at any time — the stored value never moves, so switching is instant and retroactive.",
  search: "Theme, rung or meaning…",
  allRatings: "Any rating",
  ratings: { all: "Everyone", teen: "Teen", adult: "Adult" },
  ratingHint: {
    all: "Fine for a ten-year-old.",
    teen: "Violence or horror.",
    adult: "Organised crime, the sex trade, gambling.",
  },
  renamed: "Renamed",
  renamedHint: (from: string) => `Shipped as this rather than "${from}", which is a trademark.`,
  none: "No theme matches that.",
  stage: "Stage",
  notStarted: "Not started",
  count: (themes: number, rows: number) =>
    `${themes} themes · ${rows.toLocaleString("en-CA")} named stages`,
  loading: "Reading the themes…",
} as const;

export const THEME_RATING_BADGE: Record<string, string> = {
  all: "bg-emerald-100 text-emerald-800",
  teen: "bg-amber-100 text-amber-800",
  adult: "bg-rose-100 text-rose-800",
};

/**
 * The five buckets, coloured the way the rest of the site colours SRS stages.
 * Stage 0 is "not started" and takes the muted tone rather than a bucket's.
 */
export const THEME_STAGE_TONE: Record<number, string> = {
  0: "bg-surface-muted text-foreground/60",
  1: "bg-pink-100 text-pink-900",
  2: "bg-pink-100 text-pink-900",
  3: "bg-pink-100 text-pink-900",
  4: "bg-pink-100 text-pink-900",
  5: "bg-purple-100 text-purple-900",
  6: "bg-purple-100 text-purple-900",
  7: "bg-sky-100 text-sky-900",
  8: "bg-indigo-100 text-indigo-900",
  9: "bg-amber-100 text-amber-900",
};
