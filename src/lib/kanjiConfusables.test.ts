import { describe, expect, it } from "vitest";

import {
  CONFUSABLE_SOURCES,
  areConfusable,
  confusableCounts,
  confusableEntries,
  confusablesFor,
  isConfusableSource,
} from "./kanjiConfusables";
import { kanjiPlacement } from "./kanjiLadder";

/*
 * The generated file, checked as data rather than as code. It is rebuilt from
 * two outside sources plus a curation pass, so what matters is that the shape
 * holds and that the pairs a learner actually confuses are in it.
 */
describe("the pairs file", () => {
  const entries = confusableEntries();

  it("holds a pairing for most of the ladder", () => {
    const counts = confusableCounts();
    expect(counts.pairs).toBeGreaterThan(3_000);
    expect(counts.characters).toBeGreaterThan(1_500);
  });

  it("names only sources the reader knows", () => {
    const named = new Set(entries.flatMap(([, neighbours]) => neighbours.flatMap((one) => one.sources)));
    expect([...named].every(isConfusableSource)).toBe(true);
    /* All three feed it: a build that quietly dropped one would still parse. */
    expect(named).toContain(CONFUSABLE_SOURCES.strokeEditDistance);
    expect(named).toContain(CONFUSABLE_SOURCES.wanikani);
    expect(named).toContain(CONFUSABLE_SOURCES.manual);
  });

  /*
   * A one-way warning is one the member sees only if they arrive from the
   * right side, and which side they arrive from is the one thing we do not
   * choose: the second of a pair is a median of 21 levels behind the first.
   */
  it("is symmetric, so the warning does not depend on which one you opened", () => {
    const asymmetric = entries.filter(([kanji, neighbours]) =>
      neighbours.some((neighbour) => !areConfusable(neighbour.kanji, kanji)),
    );
    expect(asymmetric).toEqual([]);
  });

  /*
   * Six is the cap the build applies; a list can run past it only where the
   * other side of a pair kept what this one cut, and 275 characters do. What
   * matters to a reader is that no list becomes a table.
   */
  it("keeps every list short enough to read, strongest first", () => {
    const lengths = entries.map(([, neighbours]) => neighbours.length);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(16);
    expect(lengths.filter((length) => length > 6).length / lengths.length).toBeLessThan(0.2);
    for (const [, neighbours] of entries) {
      const scores = neighbours.map((one) => one.score);
      expect([...scores].sort((one, other) => other - one)).toEqual(scores);
      for (const score of scores) {
        expect(score).toBeGreaterThanOrEqual(0.7);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never pairs a character with itself", () => {
    for (const [kanji, neighbours] of entries) {
      expect(neighbours.map((one) => one.kanji)).not.toContain(kanji);
    }
  });
});

describe("the pairs a learner actually confuses", () => {
  /*
   * The twelve that are on every textbook's warning list. They are the reason
   * this exists, so they are asserted by name rather than by count.
   */
  it.each([
    ["土", "士"],
    ["未", "末"],
    ["大", "太"],
    ["刀", "力"],
    ["午", "牛"],
    ["失", "矢"],
    ["建", "健"],
    ["料", "科"],
    ["昨", "作"],
    ["名", "各"],
    ["休", "体"],
    ["問", "間"],
  ])("pairs %s with %s", (one, other) => {
    expect(areConfusable(one, other)).toBe(true);
  });

  /*
   * What the pairing is for. Co-placing these is not open to us - 土 is N5 and
   * 士 is N1, and the ladder promises N5 finishes at level 10 - so the file
   * has to carry the pairs the ordering cannot reach.
   */
  it("carries pairs the ladder teaches many levels apart", () => {
    const apart = Math.abs((kanjiPlacement("土")?.level ?? 0) - (kanjiPlacement("士")?.level ?? 0));
    expect(apart).toBeGreaterThan(20);
    expect(areConfusable("土", "士")).toBe(true);
  });

  it("has the hand-added pairs neither source holds", () => {
    for (const [one, other] of [
      ["活", "話"],
      ["諸", "著"],
      ["博", "薄"],
      ["猿", "遠"],
    ]) {
      const entry = confusablesFor(one!).find((neighbour) => neighbour.kanji === other);
      expect(entry?.sources).toContain(CONFUSABLE_SOURCES.manual);
    }
  });

  it("answers nothing for a character nobody confuses with anything", () => {
    expect(confusablesFor("あ")).toEqual([]);
    expect(confusablesFor("")).toEqual([]);
  });
});
