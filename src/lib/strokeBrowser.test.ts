import { describe, expect, it } from "vitest";

import { isTaughtKanji } from "./kanjiLadder";
import { STROKE_PAGE_SIZE, isStrokeCount, kanjiByStrokeCount, strokeCounts, strokePage } from "./strokeBrowser";

describe("kanji by how many strokes they take", () => {
  const counts = strokeCounts();

  it("covers every count the dictionary holds, fewest first", () => {
    expect(counts[0]!.strokes).toBe(1);
    expect(counts.at(-1)!.strokes).toBeGreaterThan(20);
    expect(counts.map((entry) => entry.strokes)).toEqual([...counts.map((entry) => entry.strokes)].sort((a, b) => a - b));
    /*
     * The kanji the curriculum teaches, not the ten thousand characters
     * KANJIDIC holds - see the type rule below.
     *
     * One short of the ladder's 2,235, and the one is U+3005, the iteration
     * mark that stands for "the character before this one again". The ladder
     * teaches it and KANJIDIC has no entry for it, correctly: it is a
     * repetition symbol rather than a character with strokes, so a page about
     * how many strokes something takes has nothing to say about it.
     */
    expect(counts.reduce((total, entry) => total + entry.count, 0)).toBe(2_234);
  });

  it("knows what is a stroke count and what is not", () => {
    expect(isStrokeCount(12)).toBe(true);
    expect(isStrokeCount(0)).toBe(false);
    expect(isStrokeCount(99)).toBe(false);
  });

  /* One stroke is 一 and 乙, and that is all of it: the other six KANJIDIC
     holds are components. */
  it("lists the one-stroke kanji, commonest first", () => {
    const one = kanjiByStrokeCount(1);
    expect(one.length).toBe(counts[0]!.count);
    expect(one[0]!.kanji).toBe("一");
    expect(one.every((entry) => entry.strokeCount === 1)).toBe(true);
  });

  /*
   * The site teaches radicals, kanji and vocabulary, and these pages show the
   * middle one. They were built from KANJIDIC instead, which is a dictionary
   * of every character and has no opinion about our three types - so six of
   * the eight one-stroke entries were components with meanings like "katakana
   * no radical (no. 4)", each wearing a KANJI pill.
   *
   * John: "we have 3 things we teach. RADICALS KANJI and VOCAB... if it's a
   * radical, then it should not show up in the strokes."
   */
  describe("the three types decide what is on the page", () => {
    it("shows only characters the curriculum teaches as kanji", () => {
      for (const strokes of [1, 2, 3, 12]) {
        for (const entry of kanjiByStrokeCount(strokes)) {
          expect(isTaughtKanji(entry.kanji), entry.kanji).toBe(true);
        }
      }
    });

    it("leaves the components out", () => {
      const drawn = new Set(kanjiByStrokeCount(1).concat(kanjiByStrokeCount(2)).map((entry) => entry.kanji));
      for (const component of ["丿", "丶", "亅", "丨", "亠", "儿", "冂", "冫"]) {
        expect(drawn.has(component), component).toBe(false);
      }
    });

    /*
     * The care that a rule about radicals would have got wrong. A character
     * can be both, and when it is the ladder holds it twice - 164 of them. So
     * 人 belongs here as a kanji even though it is also a radical a member
     * learns in level 1.
     */
    it("keeps a character that is both a radical and a kanji", () => {
      const two = new Set(kanjiByStrokeCount(2).map((entry) => entry.kanji));
      for (const both of ["人", "力", "二", "八", "九", "十"]) {
        expect(two.has(both), both).toBe(true);
      }
    });

    /* The chips and the pages read one filter, or a chip saying "1 8" sits
       over a page of two. */
    it("counts what it shows", () => {
      for (const { strokes, count } of strokeCounts().slice(0, 6)) {
        expect(kanjiByStrokeCount(strokes)).toHaveLength(count);
      }
    });
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
