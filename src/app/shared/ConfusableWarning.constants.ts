/**
 * The look-alike warning's words, in one place for the locale layer.
 *
 * Written as a caution rather than a resemblance. "Visually similar" is a
 * label on a list; what a member needs while they are being taught 土 is that
 * they are going to answer 士 with it, and which one they have already met.
 */
export const CONFUSABLE_WARNING_COPY = {
  heading: "Don't mix up",
  /** Already taught, so the mistake is available today. */
  known: "Learned",
  /** Coming soon enough to be worth remembering now. */
  ahead: "Coming",
  aheadTitle: (level: string) => `You meet this one at ${level}`,
  knownTitle: "You have already been taught this one",
} as const;
