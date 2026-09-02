import { describe, expect, it } from "vitest";

import { STROKE_PAGE_SIZE, isStrokeCount, kanjiByStrokeCount, strokeCounts, strokePage } from "./strokeBrowser";

describe("kanji by how many strokes they take", () => {
  const counts = strokeCounts();

  it("covers every count the dictionary holds, fewest first", () => {
    expect(counts[0]!.strokes).toBe(1);
    expect(counts.at(-1)!.strokes).toBeGreaterThan(20);
    expect(counts.map((entry) => entry.strokes)).toEqual([...counts.map((entry) => entry.strokes)].sort((a, b) => a - b));
    expect(counts.reduce((total, entry) => total + entry.count, 0)).toBeGreaterThan(10_000);
  });

  it("knows what is a stroke count and what is not", () => {
    expect(isStrokeCount(12)).toBe(true);
    expect(isStrokeCount(0)).toBe(false);
    expect(isStrokeCount(99)).toBe(false);
  });

  /* One stroke is 一, 丨, 丶 and a handful more; it is the easy case to check. */
  it("lists the one-stroke kanji, commonest first", () => {
    const one = kanjiByStrokeCount(1);
    expect(one.length).toBe(counts[0]!.count);
    expect(one[0]!.kanji).toBe("一");
    expect(one.every((entry) => entry.strokeCount === 1)).toBe(true);
  });

  it("puts the ones a newspaper uses before the ones it does not", () => {
    const twelve = kanjiByStrokeCount(12);
    const firstUnranked = twelve.findIndex((entry) => entry.frequencyRank === null);
    expect(firstUnranked).toBeGreaterThan(0);
    expect(twelve.slice(0, firstUnranked).every((entry) => entry.frequencyRank !== null)).toBe(true);
  });

  it("can keep only the common ones, which is a page rather than a scroll", () => {
    const all = kanjiByStrokeCount(12);
    const common = kanjiByStrokeCount(12, { commonOnly: true });
    expect(common.length).toBeLessThan(all.length);
    expect(common.every((entry) => entry.frequencyRank !== null)).toBe(true);
  });

  it("pages them, and clamps a page number that does not exist", () => {
    const entries = kanjiByStrokeCount(12);
    const first = strokePage(entries, 1);
    expect(first.rows).toHaveLength(STROKE_PAGE_SIZE);
    expect(first.pageCount).toBeGreaterThan(1);
    expect(strokePage(entries, 999).rows[0]).toEqual(strokePage(entries, first.pageCount).rows[0]);
    expect(strokePage([], 1)).toEqual({ rows: [], pageCount: 1 });
  });
});
