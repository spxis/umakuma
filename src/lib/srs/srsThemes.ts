import themeData from "@/data/srsThemes.json";

import type { SrsThemeTag } from "./srsThemeTags";

/**
 * What each SRS stage is called, in the theme a member has chosen.
 *
 * WaniKani names its stages Apprentice, Guru, Master, Enlightened and Burned,
 * and that is the only vocabulary a learner ever sees. Ours are switchable:
 * the same nine stages read as belt colours, sumo divisions, corporate titles
 * or ghosts, and a member can change at any time.
 *
 * **The stored value never changes.** `apprentice | guru | master | …` stay
 * exactly as they are in `domainConstants.ts` — a theme is display, and the
 * repo's rule is that a persisted value is not copy. Switching is therefore
 * instant and retroactive: nothing in the database moves.
 *
 * Level 9 is not "burned" here. A member may pull an item back down when they
 * want more review, which WaniKani cannot do, so the top rung is named for
 * mastery — 横綱, 名人, 赤帯 — rather than for retirement.
 */

export const SRS_THEME_RATINGS = {
  /** Fine for a ten-year-old. */
  all: "all",
  /** Violence or horror; shown to teenagers and adults. */
  teen: "teen",
  /** Organised crime, the sex trade, gambling. Adults only. */
  adult: "adult",
} as const;

export type SrsThemeRating = (typeof SRS_THEME_RATINGS)[keyof typeof SRS_THEME_RATINGS];

export type SrsThemeLevel = {
  /** 0 is "not started"; 1-9 are the SRS stages. */
  level: number;
  term: string;
  reading: string;
  meaning: string;
  /** Five characters or fewer, for a pill. */
  short: string;
  bucket: string;
  bucketReading: string;
  bucketMeaning: string;
};

/** One tier of a theme: the bucket, and the stages sitting under it. */
export type SrsThemeBucket = {
  bucket: string;
  reading: string;
  levels: SrsThemeLevel[];
};

export type SrsTheme = {
  id: string;
  name: string;
  /** What the theme was called before it was renamed off a trademark. */
  sourceName: string;
  renamed: boolean;
  rating: SrsThemeRating;
  /**
   * What the theme is about, for the five-question picker.
   *
   * Generated: `scripts/srs-theme-tags.mjs` holds the hand-written map and
   * `pnpm themes:build` emits it here, so a tag cannot drift away from the
   * theme it describes. A theme with no tags is still browsable — the
   * questionnaire narrows the list, it never shortens it.
   */
  tags: SrsThemeTag[];
  levels: SrsThemeLevel[];
};

const themes = themeData.themes as SrsTheme[];

/** The theme a member gets before they have chosen one. */
export const DEFAULT_SRS_THEME_ID = "samurai";

export function srsThemes(): SrsTheme[] {
  return themes;
}

export function srsTheme(id: string | null | undefined): SrsTheme {
  return themes.find((theme) => theme.id === id) ?? themes.find((theme) => theme.id === DEFAULT_SRS_THEME_ID) ?? themes[0];
}

/**
 * The themes a member may be shown.
 *
 * The rating is a floor, not a preference: an account with no age recorded
 * sees only what is fine for anybody, because guessing upward is the one
 * mistake that matters here.
 */
export function srsThemesFor(rating: SrsThemeRating): SrsTheme[] {
  const allowed: Record<SrsThemeRating, SrsThemeRating[]> = {
    all: [SRS_THEME_RATINGS.all],
    teen: [SRS_THEME_RATINGS.all, SRS_THEME_RATINGS.teen],
    adult: [SRS_THEME_RATINGS.all, SRS_THEME_RATINGS.teen, SRS_THEME_RATINGS.adult],
  };
  return themes.filter((theme) => allowed[rating].includes(theme.rating));
}

/** What stage `n` is called in this theme, falling back to "not started". */
export function srsThemeLevel(theme: SrsTheme, level: number): SrsThemeLevel {
  return theme.levels.find((entry) => entry.level === level) ?? theme.levels[0];
}

/**
 * The stages gathered under the bucket each belongs to.
 *
 * A theme is two tiers, not one: five buckets over nine stages, so Apprentice
 * covers four rungs and Burned covers one. Drawn as a flat row of chips that
 * shape is invisible, and it is the shape every theme was built around.
 *
 * Grouped by consecutive run rather than by name, because a theme may reuse a
 * word across tiers — Demon Slayer's 甲 is both a bucket and a stage inside it
 * — and matching on the word alone would fold two different things together.
 *
 * Level 0 is excluded: "not started" is not a rank, and a member has not
 * reached it, they have merely not left it.
 */
export function srsThemeBuckets(theme: SrsTheme): SrsThemeBucket[] {
  const groups: SrsThemeBucket[] = [];
  for (const level of theme.levels) {
    if (level.level === 0) continue;
    const last = groups.at(-1);
    if (last && last.bucket === level.bucket) last.levels.push(level);
    else groups.push({ bucket: level.bucket, reading: level.bucketReading, levels: [level] });
  }
  return groups;
}
