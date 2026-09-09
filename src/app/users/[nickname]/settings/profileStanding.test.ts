import { describe, expect, it } from "vitest";

import { ourLevelFact, streakFact } from "./profileFacts";
import { PROFILE_COPY } from "./profileCopy";

/*
 * The profile is the page that answers "how am I doing", and it answered with
 * an address, a WaniKani level and a JLPT status. Both facts below were
 * already computed elsewhere - the streak on the XP history page, the ladder
 * badge in the site header - and neither had ever been asked for here.
 */
describe("the streak, on the page about standing", () => {
  it("counts the days when there are any", () => {
    expect(streakFact({ current: 12, longest: 12, activeToday: true }).value).toBe("12 days");
    expect(streakFact({ current: 1, longest: 4, activeToday: true }).value).toBe("1 day");
  });

  /*
   * A chain that ends yesterday still counts today. Saying so is the whole
   * point: a member who does not know it is a member who thinks it is lost.
   */
  it("says today does not count yet, rather than leaving it to be worked out", () => {
    expect(streakFact({ current: 9, longest: 9, activeToday: false }).hint).toBe(PROFILE_COPY.streakAtRisk);
    expect(streakFact({ current: 9, longest: 9, activeToday: true }).hint).toBe(PROFILE_COPY.streakHint);
  });

  it("says not started only to somebody who never had one", () => {
    expect(streakFact({ current: 0, longest: 0, activeToday: false }).value).toBe(PROFILE_COPY.streakNone);
  });

  /*
   * Found by looking at real accounts rather than fixtures: every member with
   * XP had current 0 and a longest of 7 to 98 days, because their last active
   * day was days ago. "Not started" to somebody who once kept it for
   * ninety-eight days is a lie of omission.
   */
  it("names the best a broken streak reached, rather than calling it unstarted", () => {
    const fact = streakFact({ current: 0, longest: 98, activeToday: false });

    expect(fact.value).toBe(PROFILE_COPY.streakBroken);
    expect(fact.hint).toContain("98");
  });
});

describe("the level, on the ladder the member is climbing", () => {
  /* UN20 and UG20 are different achievements over the same characters, so the
     fact is never a bare number. */
  it("names the ladder, not just the number", () => {
    expect(ourLevelFact("UN20").value).toBe("UN20");
    expect(ourLevelFact("UG43").value).toBe("UG43");
  });

  it("says not started for a member with no standing yet", () => {
    expect(ourLevelFact(null).value).toBe(PROFILE_COPY.ourLevelNone);
  });
});
