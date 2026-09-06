import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { describe, expect, it } from "vitest";

import { buildLadderCrosswalk } from "./ladderCrosswalk";
import { groupLadderByLevel, LADDER_LEVELS_PER_PAGE, summarizeLadderLevels } from "./ladderQuery";

/**
 * The level view and the table read the same rows two different ways, and
 * their payloads share no fields: one carries `rows` and `facets`, the other
 * `groups`. A component that renders both and merely hides one crashes on the
 * half that is not there, which is exactly what shipped for a minute here.
 */

const rows = buildLadderCrosswalk({
  kanji: {
    日: { level: 2, waniKaniLevel: 2, nLevel: 5 },
    一: { level: 2, waniKaniLevel: 1, nLevel: 5 },
    語: { level: 12, waniKaniLevel: 10, nLevel: 4 },
  },
  radicals: { 口: 1, 一: 1, 日: 1 },
  vocabulary: { "2467": 1, "2468": 12 },
  dictionary: new Map(),
  radicalNames: new Map([["口", "mouth"], ["一", "one"], ["日", "sun"]]),
  words: new Map([
    [2467, { characters: "これ", primaryMeaning: "this", wkLevel: 1 }],
    [2468, { characters: "日本語", primaryMeaning: "Japanese", wkLevel: 10 }],
  ]),
  wordRank: {},
});

describe("the ladder read a level at a time", () => {
  it("puts each item under its own level, split by kind", () => {
    const { groups } = groupLadderByLevel(rows, 20, 1);
    const first = groups[0];
    expect(first.level).toBe(1);
    expect(first.radicals.map((row) => row.characters).sort()).toEqual(["一", "口", "日"]);
    expect(first.kanji).toHaveLength(0);
    expect(first.vocabulary.map((row) => row.characters)).toEqual(["これ"]);

    const second = groups[1];
    expect(second.kanji.map((row) => row.characters).sort()).toEqual(["一", "日"]);
  });

  /* The number a learner cares about is what they know by the end, not what
     the level added — so the totals run from level 1, not from the page. */
  it("counts what is known through each level, not just within it", () => {
    const { groups } = groupLadderByLevel(rows, 20, 1);
    expect(groups[0].kanjiThrough).toBe(0);
    expect(groups[1].kanjiThrough).toBe(2);
    expect(groups[1].wordsThrough).toBe(1);

    /* And keeps running across a page boundary. */
    const page2 = groupLadderByLevel(rows, 20, 2, LADDER_LEVELS_PER_PAGE);
    expect(page2.groups[0].level).toBe(11);
    expect(page2.groups[1].kanjiThrough).toBe(3);
  });

  it("gives every level a row, even one the ladder placed nothing in", () => {
    const { groups } = groupLadderByLevel(rows, 20, 1);
    expect(groups).toHaveLength(LADDER_LEVELS_PER_PAGE);
    expect(groups.map((group) => group.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(groups[4].kanji).toHaveLength(0);
  });

  /*
   * A band finishes once, and the level it finishes on is a landmark. This
   * used to be "the band a level teaches", read off whichever kanji row came
   * last under a comment claiming a level never mixes two - levels 6, 7 and 8
   * each hold kanji from three bands, so for those it was row order, and for
   * the rest it made every level a landmark.
   */
  it("marks only the level a JLPT band finishes on", () => {
    const { groups } = groupLadderByLevel(rows, 20, 1);
    /* N5 completes at ladder level 10, and nowhere else. */
    expect(groups[9].completesJlpt).toBe(5);
    expect(groups[1].completesJlpt).toBeNull();
    expect(groups[0].completesJlpt).toBeNull();
    expect(groups.filter((group) => group.completesJlpt !== null)).toHaveLength(1);
  });

  it("clamps a page past the end rather than returning nothing", () => {
    const { groups, page } = groupLadderByLevel(rows, 20, 99);
    expect(page).toBe(2);
    expect(groups.length).toBeGreaterThan(0);
  });

  /*
   * The two payloads share no fields. This is the shape contract the browser
   * relies on, and asserting it here is what stops a component from reaching
   * for `rows` while the level view is open.
   */
  it("returns groups and no rows, so a table cannot read it by accident", () => {
    const payload: Record<string, unknown> = groupLadderByLevel(rows, 20, 1);
    expect(payload.groups).toBeTruthy();
    expect(payload.rows).toBeUndefined();
    expect(payload.facets).toBeUndefined();
  });
});

/**
 * A landmark is a landmark because most levels are not one.
 *
 * The picker marked a level whenever any kanji on it carried a band, which put
 * "N5 finishes here" on levels 2, 3, 4, 5, 9 and 10, and "N1 finishes here" on
 * every one of 71-80. Found 2026-09-06 while reworking the level filter; the
 * page's own blurb promises "each JLPT level finishes on a level you can point
 * at" directly above it.
 */
describe("the JLPT milestones are five levels, not ninety", () => {
  it("marks exactly the five completion levels across the whole ladder", () => {
    const summaries = summarizeLadderLevels([], KANJI_LADDER_LEVELS);
    const marked = summaries.filter((entry) => entry.completesJlpt !== null);
    expect(marked.map((entry) => `${entry.level}:N${entry.completesJlpt}`)).toEqual([
      "10:N5",
      "20:N4",
      "35:N3",
      "50:N2",
      "100:N1",
    ]);
  });

  /* Each band once. Six levels claiming N5 is the bug this replaced. */
  it("never says one band finishes twice", () => {
    const bands = summarizeLadderLevels([], KANJI_LADDER_LEVELS)
      .map((entry) => entry.completesJlpt)
      .filter((band): band is number => band !== null);
    expect(new Set(bands).size).toBe(bands.length);
  });

  /*
   * And the reason the old rule could not be trusted even in principle: three
   * levels hold kanji from more than one band, so "this level's band" had no
   * single answer for them.
   */
  it("is independent of the rows, because a level can hold several bands", () => {
    expect(summarizeLadderLevels([], KANJI_LADDER_LEVELS)[9]!.completesJlpt).toBe(5);
  });
});
