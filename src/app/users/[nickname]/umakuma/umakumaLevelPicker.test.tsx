import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import UmakumaLevelPicker from "./UmakumaLevelPicker";

/**
 * A hundred levels, with a JLPT band finishing on 10 the way the ladder does.
 *
 * Each level holds a different number of things - `level + 5` of them - so a
 * decade's count is a sum that can only come out right one way. A fixture
 * where every level held the same amount would pass a chip that added up the
 * decade next door.
 */
const LEVELS: LadderLevelSummary[] = Array.from({ length: 100 }, (_, index) => ({
  level: index + 1,
  completesJlpt: index + 1 === 10 ? 5 : null,
  radicals: 1,
  kanji: index + 1,
  vocabulary: 4,
  total: index + 6,
  added: index + 1,
}));

const draw = (current: number): Document =>
  new JSDOM(
    `<!doctype html><body>${renderToStaticMarkup(
      <UmakumaLevelPicker nickname="testkuma" levels={LEVELS} current={current} />,
    )}</body>`,
  ).window.document;

const chipText = (document: Document): string[] =>
  [...document.querySelectorAll("a")].map((anchor) => anchor.textContent?.trim() ?? "");

/**
 * The level filter, as it actually renders.
 *
 * A hundred chips in a row that would not wrap meant a reader saw levels 1 to
 * 21 and dragged for the rest. John asked for this twice, the second time with
 * a screenshot of the row cut off mid-ladder. So the properties worth pinning
 * are what a reader can see and reach, not which class names are in the file.
 */
describe("the level filter a reader points at", () => {
  it("draws ten things, not a hundred", () => {
    /* Nine shut decades and the ten levels of the open one. */
    expect(chipText(draw(24))).toHaveLength(19);
  });

  it("opens the decade holding the level being read", () => {
    const text = chipText(draw(24));
    expect(text).toContain("24(29)");
    expect(text).toContain("21(26)");
    expect(text).toContain("30(35)");
    expect(text).toContain("1-10(105)");
    expect(text).toContain("91-100(1,005)");
    /* 11 is inside a shut decade, so it is not a chip of its own. */
    expect(text.some((chip) => chip.startsWith("11("))).toBe(false);
  });

  it("marks where it is, so the filter agrees with the page under it", () => {
    const here = draw(24).querySelector('[aria-current="page"]');
    expect(here?.textContent?.trim()).toBe("24(29)");
    expect(here?.getAttribute("href")).toBe("/users/testkuma/umakuma/24");
  });

  it("opens a shut decade on its first level, not its last", () => {
    const group = [...draw(24).querySelectorAll("a")].find((anchor) =>
      anchor.textContent?.trim().startsWith("51-60"),
    );
    expect(group?.getAttribute("href")).toBe("/users/testkuma/umakuma/51");
  });

  /* In a hundred levels the JLPT finishes are the landmarks somebody
     navigates by, and they were the one thing the old row had right. */
  it("keeps the JLPT milestone marked when its decade is open", () => {
    expect(chipText(draw(10))).toContain("10N5(15)");
  });

  it("wraps rather than scrolling sideways", () => {
    const row = draw(24).querySelector('[role="navigation"]');
    expect(row?.className).toContain("flex-wrap");
    expect(row?.className).not.toContain("overflow-x-auto");
  });

  /*
   * The bug this row had: the type chips a line above it read `RADICALS (1)
   * KANJI (25) VOCAB (76)` and the levels under them were bare numbers, so the
   * filter deciding how much you are looking at was the only one that would
   * not say how much that was.
   */
  describe("says how much is behind every chip", () => {
    it("gives an open level its own total", () => {
      /* Level 24 holds 1 radical, 24 kanji and 4 words. */
      expect(chipText(draw(24))).toContain("24(29)");
    });

    it("gives a shut decade its ten levels added up", () => {
      /* 51 to 60 is 555 kanji, ten radicals and forty words. */
      expect(chipText(draw(24))).toContain("51-60(605)");
    });

    it("leaves no chip without a count", () => {
      expect(chipText(draw(24)).filter((chip) => !/\(\d[\d,]*\)$/.test(chip))).toEqual([]);
    });
  });
});
