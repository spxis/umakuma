import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { KANJI_LADDER_LEVELS, KANJI_LADDER_TOTAL } from "@/lib/kanjiLadder";

import {
  curriculumItemAt,
  itemsThroughLevel,
  levelClears,
  levelShape,
  SIM_LEVEL_SHAPES,
  SIM_TOTAL_ITEMS,
} from "./simCurriculum";

describe("the simulated curriculum", () => {
  it("is the shipped ladder, not an average of it", () => {
    expect(SIM_LEVEL_SHAPES).toHaveLength(KANJI_LADDER_LEVELS);
    expect(SIM_LEVEL_SHAPES.reduce((total, shape) => total + shape.kanji, 0)).toBe(KANJI_LADDER_TOTAL);
    /* The number a flat 93-per-level model rounds to and gets right only in
       aggregate: over nine thousand items, and none of them evenly spread. */
    expect(SIM_TOTAL_ITEMS).toBeGreaterThan(9_000);
  });

  it("gates level 1 on radicals, because it teaches no kanji", () => {
    const first = levelShape(1)!;
    expect(first.kanji).toBe(0);
    expect(first.gateKind).toBe(SUBJECT_TYPES.radical);
    expect(first.gateNeed).toBeGreaterThan(0);
  });

  it("gates every later level on its kanji, and the early gates are tiny", () => {
    const second = levelShape(2)!;
    expect(second.gateKind).toBe(SUBJECT_TYPES.kanji);
    expect(second.gateNeed).toBeLessThan(10);
    expect(levelShape(50)!.gateKind).toBe(SUBJECT_TYPES.kanji);
  });

  it("teaches radicals before kanji before vocabulary, inside a level", () => {
    const first = levelShape(1)!;
    expect(curriculumItemAt(0)?.kind).toBe(SUBJECT_TYPES.radical);
    expect(curriculumItemAt(first.radicals)?.kind).toBe(SUBJECT_TYPES.vocabulary);
    const secondStarts = first.items;
    expect(curriculumItemAt(secondStarts)?.level).toBe(2);
  });

  it("counts what standing at a level has unlocked", () => {
    expect(itemsThroughLevel(0)).toBe(0);
    expect(itemsThroughLevel(1)).toBe(levelShape(1)!.items);
    expect(itemsThroughLevel(KANJI_LADDER_LEVELS)).toBe(SIM_TOTAL_ITEMS);
  });

  it("clears a level at ninety per cent of its gate and not before", () => {
    const shape = levelShape(20)!;
    expect(levelClears(20, shape.gateNeed)).toBe(true);
    expect(levelClears(20, shape.gateNeed - 1)).toBe(false);
  });

  it("hands back nothing for an item past the end of the curriculum", () => {
    expect(curriculumItemAt(SIM_TOTAL_ITEMS)).toBeNull();
    expect(curriculumItemAt(-1)).toBeNull();
  });
});
