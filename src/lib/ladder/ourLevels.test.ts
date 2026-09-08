import { describe, expect, it } from "vitest";

import { gradePlacement } from "@/lib/gradeLadder";
import { kanjiPlacement } from "@/lib/kanjiLadder";

import { LADDER_STREAMS } from "./ladderStreams";
import { ourLevels } from "./ourLevels";

describe("ourLevels", () => {
  const un = kanjiPlacement("士")?.level ?? null;
  const ug = gradePlacement("士")?.level ?? null;

  it("fills the reader's ladder and leaves the other null", () => {
    expect(ourLevels("士", LADDER_STREAMS.un)).toEqual({ unLevel: un, ugLevel: null });
    expect(ourLevels("士", LADDER_STREAMS.ug)).toEqual({ unLevel: null, ugLevel: ug });
    expect(un).not.toBeNull();
    expect(ug).not.toBeNull();
    /* The two orderings disagree, which is the whole reason to keep them apart. */
    expect(un).not.toBe(ug);
  });

  it("reads a visitor as the exam ladder", () => {
    expect(ourLevels("士", null)).toEqual({ unLevel: un, ugLevel: null });
  });

  it("has nothing for a character no ladder teaches", () => {
    expect(ourLevels("𠮷", LADDER_STREAMS.un)).toEqual({ unLevel: null, ugLevel: null });
    expect(ourLevels("𠮷", LADDER_STREAMS.ug)).toEqual({ unLevel: null, ugLevel: null });
  });
});
