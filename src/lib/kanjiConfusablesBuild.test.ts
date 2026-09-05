import { describe, expect, it } from "vitest";

import {
  MAX_PER_KANJI,
  WANIKANI_SCORE,
  mergeConfusables,
  neighboursByKanji,
  parseOverrides,
  parseStrokeEditDistance,
} from "../../scripts/build-kanji-confusables.mjs";

/*
 * The build's own arithmetic, tested without the 227kB of corpus behind it.
 * The generated file is checked separately in `kanjiConfusables.test.ts`; this
 * is the merge that produced it.
 */
describe("reading the distance data", () => {
  /* A pivot character, then ten neighbour/score pairs, space separated. */
  const LINE = "土 士 1.0 工 1.0 五 0.75 王 0.75 二 0.5";

  it("keeps the pairs above the threshold and drops the rest", () => {
    const scores = parseStrokeEditDistance(LINE);
    /* Keyed low code point first, so a pair is stored once however it is met. */
    expect([...scores.keys()].sort()).toEqual(["五 土", "土 士", "土 工", "土 王"]);
  });

  /* A pair is listed from both sides and the two scores can differ slightly. */
  it("stores a pair once, at the higher of its two scores", () => {
    const scores = parseStrokeEditDistance("土 士 0.8\n士 土 1.0");
    expect(scores.size).toBe(1);
    expect(scores.get("土 士")).toBe(1);
  });

  it("ignores a character listed against itself", () => {
    expect(parseStrokeEditDistance("土 土 1.0").size).toBe(0);
  });
});

describe("the overrides", () => {
  it("reads the pairs a person added and removed", () => {
    const parsed = parseOverrides(
      JSON.stringify({ add: [{ pair: ["活", "話"] }], remove: [{ pair: ["土", "王"] }] }),
    );
    expect(parsed.add).toEqual([["活", "話"]]);
    expect(parsed.remove).toEqual([["土", "王"]]);
  });

  it("drops a malformed entry rather than failing the build", () => {
    const parsed = parseOverrides(JSON.stringify({ add: [{ pair: ["活"] }, { pair: ["土", "土"] }, {}] }));
    expect(parsed.add).toEqual([]);
  });

  it("takes an absent file as no corrections", () => {
    expect(parseOverrides("")).toEqual({ add: [], remove: [] });
  });
});

describe("merging the sources", () => {
  const scores = new Map([
    ["土 士", 1],
    ["土 王", 0.75],
  ]);

  it("keeps every source that named a pair", () => {
    const pairs = mergeConfusables({
      scores,
      wanikaniPairs: new Set(["土 士", "作 昨"]),
      overrides: { add: [], remove: [] },
    });
    expect(pairs.get("土 士")).toEqual({ sources: ["stroke-edit-distance", "wanikani"], score: 1 });
    /* A pairing only WaniKani made takes the standing score for their list. */
    expect(pairs.get("作 昨")).toEqual({ sources: ["wanikani"], score: WANIKANI_SCORE });
  });

  it("lets a person add a pair neither source holds", () => {
    const pairs = mergeConfusables({
      scores,
      wanikaniPairs: new Set(),
      overrides: { add: [["活", "話"]], remove: [] },
    });
    expect(pairs.get("活 話")).toEqual({ sources: ["manual"], score: 1 });
  });

  /* A person saying two characters are not confusable outranks both datasets. */
  it("lets a person remove a pair both sources hold", () => {
    const pairs = mergeConfusables({
      scores,
      wanikaniPairs: new Set(["土 士"]),
      overrides: { add: [], remove: [["土", "士"]] },
    });
    expect(pairs.has("土 士")).toBe(false);
  });
});

/* The build is a .mjs so it can be imported by another .mjs; its return shape
   travels as JSDoc, which does not reach TypeScript. Named here once. */
type Laid = Record<string, { kanji: string; score: number; sources: string[] }[]>;

function layOut(pairs: Parameters<typeof neighboursByKanji>[0], cap?: number): Laid {
  return (cap === undefined ? neighboursByKanji(pairs) : neighboursByKanji(pairs, cap)) as Laid;
}

describe("laying the pairs out per character", () => {
  it("gives both sides of a pair the same warning", () => {
    const neighbours = layOut(new Map([["土 士", { sources: ["wanikani"], score: 0.78 }]]));
    expect(neighbours["土"]![0]!.kanji).toBe("士");
    expect(neighbours["士"]![0]!.kanji).toBe("土");
  });

  it("orders a character's list strongest first", () => {
    const many = new Map(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((other, index) => [
        `土 ${other}`,
        { sources: ["wanikani"], score: 1 - index / 100 },
      ]),
    );
    const neighbours = layOut(many);
    expect(neighbours["土"]![0]!.kanji).toBe("a");
  });

  /*
   * The cap cuts the weakest, and then the symmetry rule puts back anything
   * the other side kept: a member reading the crowded character must still be
   * warned about the twin that reads the warning back at them.
   */
  it("caps a list, then keeps a pair the other side still holds", () => {
    const many = new Map(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((other, index) => [
        `土 ${other}`,
        { sources: ["wanikani"], score: 1 - index / 100 },
      ]),
    );
    expect(Object.keys(layOut(many, MAX_PER_KANJI))).toHaveLength(9);
    /* Each of the eight holds 土 alone, so all eight come back to it. */
    expect(layOut(many, MAX_PER_KANJI)["土"]).toHaveLength(8);
    /* Without a second side to answer for them, the cap is the cap. */
    const crowded = layOut(many, 3);
    expect(crowded["土"]!.length).toBeGreaterThanOrEqual(3);
  });
});
