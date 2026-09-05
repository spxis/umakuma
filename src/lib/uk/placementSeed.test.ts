import { describe, expect, it } from "vitest";

import {
  PLACEMENT_MISSED_STAGE,
  PLACEMENT_SEED_DELAY_DAYS,
  PLACEMENT_SEED_STAGE,
  planPlacementSeed,
  type PlacementSeedSubject,
} from "./placementSeed";

const NOW = new Date("2026-09-04T12:00:00.000Z");

/* Four levels of three items each, which is the ladder's shape in miniature. */
const SUBJECTS: PlacementSeedSubject[] = [1, 2, 3, 4].flatMap((level) =>
  [0, 1, 2].map((offset) => ({ subjectId: level * 10 + offset, level })),
);

const plan = (floor: number, missedSubjectIds: number[] = []) =>
  planPlacementSeed({ subjects: SUBJECTS, floor, missedSubjectIds, now: NOW });

describe("planPlacementSeed", () => {
  it("credits everything below the floor and nothing at or above it", () => {
    const result = plan(3);
    expect(result.rows).toHaveLength(6);
    expect(result.rows.every((row) => row.subjectId < 30)).toBe(true);
  });

  it("writes nothing at all for a member placed at level 1", () => {
    /* The beginner path. There is nothing below level 1 to credit. */
    expect(plan(1).rows).toHaveLength(0);
  });

  it("puts the credit at Guru, due in a week", () => {
    const row = plan(3).rows[0]!;
    expect(row.srsStage).toBe(PLACEMENT_SEED_STAGE);
    expect(row.availableAt.getTime() - NOW.getTime()).toBe(PLACEMENT_SEED_DELAY_DAYS * 24 * 60 * 60_000);
  });

  it("puts what the test saw missed at the bottom, due now", () => {
    const result = plan(3, [11, 22]);
    const missed = result.rows.filter((row) => row.srsStage === PLACEMENT_MISSED_STAGE);
    expect(missed.map((row) => row.subjectId).sort()).toEqual([11, 22]);
    expect(missed.every((row) => row.availableAt.getTime() === NOW.getTime())).toBe(true);
    expect(result.seededMissed).toBe(2);
    expect(result.seeded).toBe(4);
  });

  it("ignores a missed item the member has not unlocked yet", () => {
    /* Missed at rung 35 while the floor came out at 26: it is above their
       level, so it arrives as a lesson rather than as a review they cannot
       have been taught. */
    const result = plan(3, [40]);
    expect(result.rows.some((row) => row.subjectId === 40)).toBe(false);
    expect(result.seededMissed).toBe(0);
  });

  it("does not claim a pass date for work the member never did", () => {
    /* Only the floor is permanent. An over-credited item has to be able to
       fall back out of its level when the member gets it wrong. */
    expect(Object.keys(plan(2).rows[0]!)).not.toContain("passedAt");
  });
});
