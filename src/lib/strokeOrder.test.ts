import { describe, expect, it } from "vitest";

import { STROKE_ORDER_GRADES, getStrokeOrder, strokeOrderAttribution } from "./strokeOrder";

/*
 * The generated data is what the animation draws, so these pin the shape the
 * build produces: a rebuild that quietly loses strokes, or an SVG format change
 * upstream, fails here rather than showing a child a half-written character.
 */

describe("getStrokeOrder", () => {
  it("gives one path per stroke, in writing order", () => {
    const sun = getStrokeOrder("日", 1);
    expect(sun?.strokeCount).toBe(4);
    expect(sun?.strokes).toHaveLength(4);
    expect(sun?.strokes[0]).toMatch(/^M/);
  });

  it("knows the simplest character has a single stroke", () => {
    expect(getStrokeOrder("一", 1)?.strokeCount).toBe(1);
  });

  it("agrees with a well-known stroke count", () => {
    // 学 is eight strokes and is taught in first grade.
    expect(getStrokeOrder("学", 1)?.strokeCount).toBe(8);
  });

  it("finds a character without being told its grade", () => {
    expect(getStrokeOrder("水")?.strokeCount).toBeGreaterThan(0);
  });

  it("returns nothing for something that is not a kanji it holds", () => {
    expect(getStrokeOrder("Z")).toBeNull();
  });

  it("carries the viewBox the paths are drawn in", () => {
    expect(getStrokeOrder("日", 1)?.viewBox).toBe("0 0 109 109");
  });
});

describe("attribution", () => {
  /*
   * KanjiVG is CC BY-SA: the credit is a licence condition, not decoration, so
   * it travels with the data rather than being remembered separately.
   */
  it("names the source and licence with every character", () => {
    const attribution = getStrokeOrder("日", 1)?.attribution;
    expect(attribution?.source).toBe("KanjiVG");
    expect(attribution?.licence).toContain("CC BY-SA");
    expect(attribution?.url).toContain("kanjivg");
  });

  it("pins the commit the data was built from, so a rebuild is reproducible", () => {
    expect(strokeOrderAttribution()?.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("coverage", () => {
  it("holds a file for every school grade band", () => {
    expect(STROKE_ORDER_GRADES).toEqual([1, 2, 3, 4, 5, 6, 8, 9]);
  });

  it("covers characters across the bands, not just the first", () => {
    for (const [kanji, grade] of [["一", 1], ["引", 2], ["曲", 3]] as const) {
      expect(getStrokeOrder(kanji, grade)?.strokes.length).toBeGreaterThan(0);
    }
  });
});
