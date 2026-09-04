/**
 * How old a member is, roughly, and what that lets them see.
 *
 * Not a birthdate. UmaKuma needs one thing from age — whether to offer a
 * member the themes about organised crime, the sex trade and gambling — and a
 * date of birth is more personal data than that question is worth. Three bands
 * answer it.
 *
 * An account that has never said is treated as the youngest. Guessing upward
 * is the only mistake here that reaches a child, so the default is the safe
 * one rather than the permissive one.
 */

import { SRS_THEME_RATINGS, type SrsThemeRating } from "./srsThemes";

export const AGE_BANDS = {
  under13: "under_13",
  teen: "13_17",
  adult: "18_plus",
} as const;

export type AgeBand = (typeof AGE_BANDS)[keyof typeof AGE_BANDS];

export const AGE_BAND_VALUES = Object.values(AGE_BANDS);

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === "string" && (AGE_BAND_VALUES as string[]).includes(value);
}

/** The highest rating an age band may be shown. */
export function ratingFor(band: string | null | undefined): SrsThemeRating {
  switch (band) {
    case AGE_BANDS.adult:
      return SRS_THEME_RATINGS.adult;
    case AGE_BANDS.teen:
      return SRS_THEME_RATINGS.teen;
    default:
      /* Under 13, or never asked. */
      return SRS_THEME_RATINGS.all;
  }
}
