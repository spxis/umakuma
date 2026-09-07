import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "./ladder/ladderStreams";
import { ourLevelBadge } from "./levelBadge";

/*
 * The badge said UN at everybody for as long as it existed. A member on the
 * school ordering read a standing they are not taught against, under a prefix
 * claiming they were - the header was fixed for it, then the subject pages,
 * and the study explorer was still doing it a release later. One helper now,
 * because four places choosing between two prefixes is three chances to
 * choose wrong.
 */
describe("ours, on the ladder this member climbs", () => {
  it("names the school ladder for a member on it", () => {
    expect(ourLevelBadge(LADDER_STREAMS.ug, 6)).toBe("UG6");
  });

  it("names the exam ladder for a member on it", () => {
    expect(ourLevelBadge(LADDER_STREAMS.un, 9)).toBe("UN9");
  });

  it("shows the exam ladder to somebody with no stream at all", () => {
    /* A visitor. It is the site's headline ordering, said in one place
       rather than defaulted in each component. */
    expect(ourLevelBadge(null, 9)).toBe("UN9");
  });

  it("draws nothing where there is no level", () => {
    expect(ourLevelBadge(LADDER_STREAMS.ug, null)).toBeNull();
    expect(ourLevelBadge(LADDER_STREAMS.un, undefined)).toBeNull();
  });
});
