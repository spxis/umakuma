/**
 * What a finished run has to say about XP - the one rule, in one place.
 *
 * Three answers, and the third is the one that is easy to get wrong. A run
 * carries `xpAwarded` and `xpSkipped`, both recorded at the moment the payment
 * was decided, and a zero in the first means two different things depending on
 * the second:
 *
 *   paid        it earned something, and the amount is the whole story
 *   none        it earned nothing, and `xpSkipped` says why
 *   unrecorded  it earned nothing and gave no reason - a run from before any
 *               of this was written down (the columns landed in 1.42.0 and
 *               were first filled in 1.47.0)
 *
 * Calling `unrecorded` "no XP" would be a guess about a game nobody measured,
 * which is exactly the guess the whole feature exists to stop making. The
 * results panel refused it from the start; the history page has to refuse it
 * the same way, and one function is how the two cannot drift.
 */

export const GAME_XP_OUTCOMES = {
  paid: "paid",
  none: "none",
  unrecorded: "unrecorded",
} as const;

export type GameXpOutcome = (typeof GAME_XP_OUTCOMES)[keyof typeof GAME_XP_OUTCOMES];

export function gameXpOutcome(run: { xpAwarded: number; xpSkipped: string | null }): GameXpOutcome {
  if (run.xpAwarded > 0) return GAME_XP_OUTCOMES.paid;
  return run.xpSkipped ? GAME_XP_OUTCOMES.none : GAME_XP_OUTCOMES.unrecorded;
}
