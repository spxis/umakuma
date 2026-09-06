import { describe, expect, it } from "vitest";

import {
  CONFUSABLE_LOOKAHEAD_LEVELS,
  CONFUSABLE_STANDINGS,
  confusableWarnings,
} from "./kanjiConfusableWarning";
import { kanjiPlacement } from "./kanjiLadder";
import { LEVEL_SYSTEMS } from "./levelBadge";

/*
 * John, asking for this: "it's good to know that the kanji you're looking at
 * could be confused with something else later so I keep this in mind" - and
 * "it's not as irrelevant if they were on a very far level and you haven't
 * been there yet, so you wouldn't even care about that at that time." Both
 * halves are tested here, because the second is what stops the first becoming
 * a warning on every character.
 */
const EARTH_WK = kanjiPlacement("土")?.waniKaniLevel ?? 0;
const GENTLEMAN_WK = kanjiPlacement("士")?.waniKaniLevel ?? 0;

describe("who gets warned about what", () => {
  it("names a twin the member has already been taught", () => {
    const warnings = confusableWarnings("土", GENTLEMAN_WK);
    const twin = warnings.find((warning) => warning.kanji === "士");
    expect(twin?.standing).toBe(CONFUSABLE_STANDINGS.known);
  });

  it("flags a twin close enough ahead to be worth remembering", () => {
    const justBefore = GENTLEMAN_WK - 1;
    const warnings = confusableWarnings("土", justBefore);
    const twin = warnings.find((warning) => warning.kanji === "士");
    expect(twin?.standing).toBe(CONFUSABLE_STANDINGS.ahead);
  });

  it("says nothing about a twin still far off", () => {
    const farOff = GENTLEMAN_WK - CONFUSABLE_LOOKAHEAD_LEVELS - 1;
    const warnings = confusableWarnings("土", farOff);
    expect(warnings.map((warning) => warning.kanji)).not.toContain("士");
  });

  /* A mistake available today outranks one that is coming. */
  it("puts the twins they know first", () => {
    const warnings = confusableWarnings("土", 60);
    const standings = warnings.map((warning) => warning.standing);
    expect(standings).toEqual([...standings].sort((one) => (one === CONFUSABLE_STANDINGS.known ? -1 : 1)));
  });

  it("warns about nothing at all when the member has no level", () => {
    expect(confusableWarnings("土", null)).toEqual([]);
  });

  it("carries the words and both levels, so a chip can be drawn from it", () => {
    const [first] = confusableWarnings("土", 60);
    expect(first?.meaning?.length).toBeGreaterThan(0);
    expect(first?.reading).not.toContain(".");
    expect(typeof first?.wkLevel).toBe("number");
    expect(typeof first?.unLevel).toBe("number");
  });

  /*
   * A surface on our own ladder asks in our own numbering. 土 is UK5 and 士 is
   * UK52, so the same pair answers differently depending on which ladder the
   * question is asked in - which is the reason the system is a parameter.
   */
  it("answers in the ladder the surface is on", () => {
    const onOurs = confusableWarnings("土", 50, LEVEL_SYSTEMS.umakuma);
    expect(onOurs.map((warning) => warning.kanji)).toContain("士");
    const early = confusableWarnings("土", EARTH_WK, LEVEL_SYSTEMS.umakuma);
    expect(early.map((warning) => warning.kanji)).not.toContain("士");
  });
});
