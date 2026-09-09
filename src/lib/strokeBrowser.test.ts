import { describe, expect, it } from "vitest";

import { isTaughtKanji } from "./kanjiLadder";
import { SUBJECT_TYPES } from "./domainConstants";
import {
  STROKE_PAGE_SIZE,
  STROKE_TYPE_FILTERS,
  STROKE_TYPE_VALUES,
  isStrokeCount,
  kanjiByStrokeCount,
  strokeCounts,
  strokePage,
} from "./strokeBrowser";

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

  /* Keeping only the common ones is one of five filters now, and they have to
     compose and be counted against each other - so the narrowing lives in
     narrowBySources and this hands it everything at the count. */
  it("hands over every kanji at the count, for the filters to narrow", () => {
    const twelve = kanjiByStrokeCount(12);
    expect(twelve.some((entry) => entry.frequencyRank === null)).toBe(true);
    expect(twelve.some((entry) => entry.frequencyRank !== null)).toBe(true);
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

/*
 * Radicals alongside the kanji, which John asked for after the pages were
 * narrowed to what the curriculum teaches - "we could also add Radicals and
 * Kanji, but then we have to do the colours correctly and allow the user to
 * filter out Radicals or Kanji from the stroke chart."
 *
 * Off by default, deliberately. His earlier instruction was the stronger one -
 * "if it's a radical, then it should not show up in the strokes" - so this is
 * a thing a reader turns on, not a thing that arrives unasked.
 */
describe("radicals, alongside the kanji when asked for", () => {
  it("shows none of them until the reader asks", () => {
    const drawnByDefault = new Set(kanjiByStrokeCount(1).concat(kanjiByStrokeCount(2)).map((entry) => entry.kanji));

    for (const component of ["丿", "丶", "亅", "亠", "儿", "冂"]) {
      expect(drawnByDefault.has(component), component).toBe(false);
    }
    expect(kanjiByStrokeCount(1).every((entry) => entry.subjectType === SUBJECT_TYPES.kanji)).toBe(true);
  });

  it("shows the whole radical set when asked for radicals", () => {
    const total = strokeCounts(STROKE_TYPE_FILTERS.radical).reduce((sum, entry) => sum + entry.count, 0);

    expect(total).toBe(253);
    for (const entry of kanjiByStrokeCount(1, STROKE_TYPE_FILTERS.radical)) {
      expect(entry.subjectType).toBe(SUBJECT_TYPES.radical);
    }
  });

  /*
   * 164 characters are held by the ladder twice, once as a radical and once as
   * a kanji. Drawn twice side by side that reads as a bug to anybody who does
   * not know the ladder, so the combined view shows each character once.
   */
  it("draws a character that is both only once, and as the kanji", () => {
    const both = kanjiByStrokeCount(2, STROKE_TYPE_FILTERS.all);
    const seen = new Set(both.map((entry) => entry.kanji));

    expect(seen.size).toBe(both.length);
    const person = both.find((entry) => entry.kanji === "人");
    expect(person?.subjectType).toBe(SUBJECT_TYPES.kanji);
  });

  /* The counts the chips print have to be the counts the page shows, which is
     the whole reason the filter is read by both. */
  it("counts each type the way the page will draw it", () => {
    for (const type of STROKE_TYPE_VALUES) {
      const count = strokeCounts(type).find((entry) => entry.strokes === 2)?.count ?? 0;
      expect(kanjiByStrokeCount(2, type).length, type).toBe(count);
    }
  });
});
