import { describe, expect, it } from "vitest";

import { GAME_XP_OUTCOMES, gameXpOutcome } from "./gameXpOutcome";

describe("what a finished run says about XP", () => {
  it("reads a payment as a payment", () => {
    expect(gameXpOutcome({ xpAwarded: 50, xpSkipped: null })).toBe(GAME_XP_OUTCOMES.paid);
  });

  it("reads nothing-with-a-reason as nothing earned", () => {
    expect(gameXpOutcome({ xpAwarded: 0, xpSkipped: "daily-allowance" })).toBe(
      GAME_XP_OUTCOMES.none,
    );
  });

  /*
   * The distinction the whole feature turns on. A run from before the columns
   * were filled in holds a zero that means "not written down", and calling it
   * "no XP" would be a claim about a game nobody measured.
   */
  it("refuses to call an unrecorded run a run that earned nothing", () => {
    expect(gameXpOutcome({ xpAwarded: 0, xpSkipped: null })).toBe(GAME_XP_OUTCOMES.unrecorded);
  });

  /*
   * A run that paid AND recorded a reason is a paid run: the amount is the
   * fact, and a stale reason beside it must not turn the row into "no XP".
   */
  it("lets the payment win over a reason recorded beside it", () => {
    expect(gameXpOutcome({ xpAwarded: 5, xpSkipped: "daily-allowance" })).toBe(
      GAME_XP_OUTCOMES.paid,
    );
  });
});
