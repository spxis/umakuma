/**
 * Where a member stands in relation to the twin they are being warned about.
 *
 * The two are different warnings and read differently. `known` means they have
 * already been taught the other one, so the risk is live: they are holding two
 * shapes and one of them is about to be answered wrong. `ahead` means the twin
 * is coming, and the warning is a note to keep - which is what John asked for
 * in the first place, so that meeting the second one is a recognition rather
 * than a collision.
 *
 * A twin far enough ahead has no standing at all and is not shown. A pair 40
 * levels away is not a warning, it is trivia, and the study surfaces already
 * hold related items to two levels ahead for the same reason.
 */
export const CONFUSABLE_STANDINGS = {
  known: "known",
  ahead: "ahead",
} as const;

export type ConfusableStanding = (typeof CONFUSABLE_STANDINGS)[keyof typeof CONFUSABLE_STANDINGS];

export type ConfusableWarning = {
  kanji: string;
  meaning: string | null;
  reading: string | null;
  /** WaniKani's level for the twin, which is the ladder a study surface is on. */
  wkLevel: number | null;
  /** Ours, for a surface that teaches from the UmaKuma ladder. */
  unLevel: number | null;
  standing: ConfusableStanding;
};
