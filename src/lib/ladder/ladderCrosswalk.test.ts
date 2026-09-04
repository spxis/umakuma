import { describe, expect, it } from "vitest";

import ladderData from "@/data/kanjiLadder.json";
import { SUBJECT_TYPES } from "@/lib/domainConstants";

import { buildLadderCrosswalk, LADDER_SOURCES, type LadderCrosswalkInput } from "./ladderCrosswalk";
import { EMPTY_LADDER_QUERY, queryLadder, summarizeLadderLevels } from "./ladderQuery";

/**
 * The crosswalk is the first surface that reads our ladder beside everybody
 * else's, so what it must never do is quietly lose an item: a level that looks
 * light because its words did not join is a curriculum decision made by a bug.
 */

const input: LadderCrosswalkInput = {
  kanji: {
    日: { level: 1, waniKaniLevel: 2, nLevel: 5 },
    苺: { level: 14, waniKaniLevel: null, nLevel: null },
  },
  radicals: { 口: 1 },
  vocabulary: { "2467": 3, "9999": 4 },
  dictionary: new Map([
    ["日", { primaryMeaning: "day", schoolGrade: 1, frequencyRank: 1 }],
    ["苺", { primaryMeaning: "strawberry", schoolGrade: null, frequencyRank: 2000 }],
    ["口", { primaryMeaning: "mouth", schoolGrade: 1, frequencyRank: 320 }],
  ]),
  words: new Map([[2467, { characters: "一つ", primaryMeaning: "one thing", wkLevel: 2 }]]),
  wordRank: { "2467": 88 },
};

describe("the ladder beside every other scale", () => {
  it("gives a row to each kind, in teaching order within a level", () => {
    const rows = buildLadderCrosswalk(input);
    expect(rows.map((row) => row.key)).toEqual(["radical:口", "kanji:日", "wk:2467", "kanji:苺"]);
    expect(rows[0].kind).toBe(SUBJECT_TYPES.radical);
  });

  it("names the source each item's facts come from", () => {
    const rows = buildLadderCrosswalk(input);
    const bySource = Object.fromEntries(rows.map((row) => [row.key, row.source]));
    expect(bySource["radical:口"]).toBe(LADDER_SOURCES.radkfile);
    /* WaniKani teaches 日, so its meanings are theirs. */
    expect(bySource["kanji:日"]).toBe(LADDER_SOURCES.wanikani);
    /* 苺 is jōyō that WaniKani skips; KANJIDIC2 is the only source for it. */
    expect(bySource["kanji:苺"]).toBe(LADDER_SOURCES.kanjidic);
  });

  /* A word whose subject the catalogue has never seen cannot be drawn. */
  it("drops a word with no catalogue row rather than drawing a blank", () => {
    const rows = buildLadderCrosswalk(input);
    expect(rows.some((row) => row.key === "wk:9999")).toBe(false);
  });

  it("carries all four scales onto one line", () => {
    const row = buildLadderCrosswalk(input).find((entry) => entry.key === "kanji:日");
    expect(row).toMatchObject({ ukLevel: 1, wkLevel: 2, nLevel: 5, schoolGrade: 1, frequencyRank: 1 });
  });
});

describe("searching the crosswalk", () => {
  const rows = buildLadderCrosswalk(input);

  it("finds a row by its glyph or its meaning", () => {
    expect(queryLadder(rows, { ...EMPTY_LADDER_QUERY, search: "苺" }).total).toBe(1);
    expect(queryLadder(rows, { ...EMPTY_LADDER_QUERY, search: "strawberry" }).total).toBe(1);
    expect(queryLadder(rows, { ...EMPTY_LADDER_QUERY, search: "MOUTH" }).total).toBe(1);
  });

  it("filters to what WaniKani never teaches", () => {
    const found = queryLadder(rows, { ...EMPTY_LADDER_QUERY, onlyMissingFromWanikani: true });
    expect(found.rows.map((row) => row.key).sort()).toEqual(["kanji:苺", "radical:口"]);
  });

  it("bounds by our own level", () => {
    expect(queryLadder(rows, { ...EMPTY_LADDER_QUERY, ukLevelMin: 3, ukLevelMax: 20 }).total).toBe(2);
  });

  /*
   * A chip says what pressing it would give, so its count ignores the filter
   * it sets and honours every other one.
   */
  it("counts a facet as if its own filter were off", () => {
    const found = queryLadder(rows, { ...EMPTY_LADDER_QUERY, kind: SUBJECT_TYPES.kanji });
    expect(found.total).toBe(2);
    expect(found.facets.kind[SUBJECT_TYPES.radical]).toBe(1);
    expect(found.facets.kind[SUBJECT_TYPES.vocabulary]).toBe(1);
  });

  it("clamps a page past the end rather than showing nothing", () => {
    expect(queryLadder(rows, { ...EMPTY_LADDER_QUERY, page: 99 }).page).toBe(1);
  });
});

describe("the shape of the ladder", () => {
  it("counts each level's radicals, kanji and words", () => {
    const summaries = summarizeLadderLevels(buildLadderCrosswalk(input), 20);
    expect(summaries[0]).toMatchObject({ level: 1, radicals: 1, kanji: 1, vocabulary: 0, total: 2 });
    expect(summaries[13]).toMatchObject({ level: 14, kanji: 1, added: 1 });
  });

  /*
   * Against the real ladder, not a fixture: every kanji and radical the file
   * places has to reach a row, or a level is lighter on screen than it is in
   * the curriculum.
   */
  it("loses no kanji or radical from the shipped ladder", () => {
    const rows = buildLadderCrosswalk({
      kanji: ladderData.kanjiLevel,
      radicals: ladderData.radicalLevel,
      vocabulary: {},
      dictionary: new Map(),
      words: new Map(),
      wordRank: {},
    });
    expect(rows.filter((row) => row.kind === SUBJECT_TYPES.kanji)).toHaveLength(ladderData.totalKanji);
    expect(rows.filter((row) => row.kind === SUBJECT_TYPES.radical)).toHaveLength(
      Object.keys(ladderData.radicalLevel).length,
    );
    for (const row of rows) expect(row.ukLevel).toBeLessThanOrEqual(ladderData.levels);
  });

  it("marks exactly the kanji WaniKani never taught", () => {
    const rows = buildLadderCrosswalk({
      kanji: ladderData.kanjiLevel,
      radicals: {},
      vocabulary: {},
      dictionary: new Map(),
      words: new Map(),
      wordRank: {},
    });
    const added = rows.filter((row) => row.source === LADDER_SOURCES.kanjidic);
    expect(added).toHaveLength(ladderData.source.addedJoyo);
  });
});
