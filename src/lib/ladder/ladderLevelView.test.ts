import { describe, expect, it } from "vitest";

import { buildLadderCrosswalk } from "./ladderCrosswalk";
import { groupLadderByLevel, LADDER_LEVELS_PER_PAGE } from "./ladderQuery";

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

  it("names the JLPT band a level teaches, where it teaches one", () => {
    const { groups } = groupLadderByLevel(rows, 20, 1);
    expect(groups[1].nLevel).toBe(5);
    /* A level with no kanji has no band of its own. */
    expect(groups[0].nLevel).toBeNull();
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
