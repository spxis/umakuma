import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";

import { planWanikaniImport, type UkImportTarget, type WanikaniAssignment } from "./ukImport";
import type { UkLevelTotals } from "./unLevel";

/* Three levels of two kanji each, plus a radicals-only level 1 — the real
   ladder's shape in miniature. */
const TOTALS: UkLevelTotals[] = [
  { level: 1, kanji: 0, radicals: 4 },
  { level: 2, kanji: 2, radicals: 2 },
  { level: 3, kanji: 2, radicals: 2 },
  { level: 4, kanji: 2, radicals: 2 },
];

const TARGETS: UkImportTarget[] = [
  { subjectId: 101, wkSubjectId: 1, kind: SUBJECT_TYPES.kanji, level: 2 },
  { subjectId: 102, wkSubjectId: 2, kind: SUBJECT_TYPES.kanji, level: 2 },
  { subjectId: 103, wkSubjectId: 3, kind: SUBJECT_TYPES.kanji, level: 3 },
  { subjectId: 104, wkSubjectId: 4, kind: SUBJECT_TYPES.kanji, level: 3 },
  { subjectId: 105, wkSubjectId: 5, kind: SUBJECT_TYPES.kanji, level: 4 },
  { subjectId: 201, wkSubjectId: 20, kind: SUBJECT_TYPES.radical, level: 1 },
];

function assignment(subjectId: number, srsStage: number): WanikaniAssignment {
  return { subjectId, srsStage, unlockedAt: null, startedAt: null, passedAt: null, burnedAt: null, availableAt: null };
}

const plan = (assignments: WanikaniAssignment[], existing?: Map<number, { srsStage: number; lastReviewedAt: Date | null }>) =>
  planWanikaniImport({ assignments, targets: TARGETS, totals: TOTALS, existing, maxLevel: 4 });

describe("planWanikaniImport", () => {
  it("carries every started item across at the stage it was left on", () => {
    const result = plan([assignment(1, 9), assignment(2, 5), assignment(20, 4)]);
    expect(result.states).toHaveLength(3);
    expect(result.states.find((state) => state.subjectId === 101)?.srsStage).toBe(9);
    expect(result.states.find((state) => state.subjectId === 201)?.srsStage).toBe(4);
  });

  it("ignores assignments that were never started", () => {
    /* Stage 0 is unlocked-but-untouched. It says nothing about what they know. */
    expect(plan([assignment(1, 0)]).states).toHaveLength(0);
  });

  it("counts WaniKani radicals we do not teach rather than failing on them", () => {
    /* Ours are RADKFILE's 253; WaniKani draws several hundred more as pictures
       with no character at all. On real WK17 data this is 312 of 2,774. */
    const result = plan([assignment(1, 5), assignment(9999, 9)]);
    expect(result.summary.unmatched).toBe(1);
    expect(result.summary.matched).toBe(1);
  });

  it("earns a floor from 90% of each level's kanji at Guru, not from the WK level", () => {
    /* WaniKani's order and ours differ, so their level number means nothing
       here. Level 2 and 3 clear; level 4 has one of two, so it stops. */
    const result = plan([assignment(1, 5), assignment(2, 6), assignment(3, 9), assignment(4, 5), assignment(5, 5)]);
    expect(result.floor).toBe(4);
    expect(result.summary.levelsCleared).toBe(3);
  });

  it("does not let a radicals-only level block the walk", () => {
    /* A member arriving mid-ladder has plainly met level 1's radicals, and
       WaniKani may not have taught the ones we use. */
    const result = plan([assignment(1, 5), assignment(2, 5)]);
    expect(result.floor).toBe(3);
  });

  it("stops at the first level that is not 90% done", () => {
    const result = plan([assignment(1, 5), assignment(2, 5), assignment(3, 5)]);
    expect(result.floor).toBe(3);
  });

  it("never walks back work done here — raise-only", () => {
    /* The failure this prevents: a re-import after six months of study on our
       ladder resetting a member to whatever WaniKani last knew. */
    const existing = new Map([[101, { srsStage: 8, lastReviewedAt: new Date("2026-09-01") }]]);
    const result = plan([assignment(1, 2)], existing);
    expect(result.states).toHaveLength(0);
    expect(result.summary.skippedNotHigher).toBe(1);
  });

  it("still raises an untouched row that WaniKani has further along", () => {
    const existing = new Map([[101, { srsStage: 2, lastReviewedAt: null }]]);
    expect(plan([assignment(1, 7)], existing).states).toHaveLength(1);
    expect(plan([assignment(1, 1)], existing).states).toHaveLength(0);
  });

  it("keeps the timestamps, so intervals line up rather than restarting", () => {
    const burned = new Date("2025-05-24T06:50:05Z");
    const result = planWanikaniImport({
      assignments: [{ ...assignment(1, 9), burnedAt: burned, passedAt: burned }],
      targets: TARGETS,
      totals: TOTALS,
      maxLevel: 4,
    });
    expect(result.states[0].burnedAt).toEqual(burned);
  });
});
