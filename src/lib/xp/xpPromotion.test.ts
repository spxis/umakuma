import { describe, expect, it } from "vitest";

import { xpForLevel, xpLevelFor } from "./xpCurve";
import { latestPromotion, promotionsWithin } from "./xpPromotion";

/* Real thresholds, so the test cannot pass against a curve it invented. */
const AT_5 = xpForLevel(5);
const AT_6 = xpForLevel(6);

describe("finding when somebody reached the rank they hold", () => {
  it("names the day the total first crossed the threshold", () => {
    const promotion = latestPromotion(AT_6 + 10, [
      { dayKey: "2026-09-05", amount: 5 },
      { dayKey: "2026-09-04", amount: AT_6 - AT_5 },
      { dayKey: "2026-09-03", amount: 5 },
    ]);

    expect(promotion).toEqual({ level: xpLevelFor(AT_6 + 10), dayKey: "2026-09-04" });
  });

  /*
   * Somebody who was already here before the window opened has no promotion
   * *in these days*, which is not the same as never having been promoted. The
   * board shows a window, so null is the honest answer.
   */
  it("returns nothing when they were already there", () => {
    expect(latestPromotion(AT_6 + 500, [{ dayKey: "2026-09-05", amount: 1 }])).toBeNull();
  });

  it("returns nothing for a member with no earning in the window", () => {
    expect(latestPromotion(AT_6, [])).toBeNull();
  });
});

describe("every promotion inside a window", () => {
  it("finds several across different days", () => {
    const promotions = promotionsWithin(AT_6, [
      { dayKey: "2026-09-05", amount: AT_6 - AT_5 },
      { dayKey: "2026-09-04", amount: AT_5 },
    ]);

    expect(promotions.length).toBeGreaterThanOrEqual(2);
    expect(promotions[0]!.dayKey).toBe("2026-09-05");
    /* Newest first, and each rank appears once. */
    expect(new Set(promotions.map((p) => p.level)).size).toBe(promotions.length);
  });

  /* A big day can carry somebody through more than one rank, and all of them
     happened on that day rather than being spread out to look tidier. */
  it("credits every rank a single big day carried them through", () => {
    const promotions = promotionsWithin(AT_6, [{ dayKey: "2026-09-05", amount: AT_6 }]);

    expect(promotions.length).toBeGreaterThan(1);
    expect(new Set(promotions.map((p) => p.dayKey))).toEqual(new Set(["2026-09-05"]));
  });

  it("finds nothing for a member who only ticked over", () => {
    expect(promotionsWithin(AT_6 + 100, [{ dayKey: "2026-09-05", amount: 1 }])).toEqual([]);
  });
});

/*
 * A seeded account can hold a total its events cannot explain. The walk must
 * fail safe there - report nothing rather than name a day somebody did not
 * climb on - because a promotions page that invents dates is worse than one
 * that is quiet.
 */
describe("a total the events cannot explain", () => {
  it("reports nothing rather than guessing a day", () => {
    expect(promotionsWithin(8_450, [{ dayKey: "2026-09-05", amount: 100 }])).toEqual([]);
    expect(latestPromotion(8_450, [{ dayKey: "2026-09-05", amount: 100 }])).toBeNull();
  });
});
