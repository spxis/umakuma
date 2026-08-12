import { describe, expect, it } from "vitest";

import { reviewEaseScore, sortReviewsByDifficulty } from "@/lib/reviewDifficulty";

const NOW_MS = Date.UTC(2026, 7, 12);

describe("review difficulty", () => {
  it("ranks proven high-success, high-SRS reviews as easiest", () => {
    const items = [
      { subjectId: 1, srsStage: 2, wkLevel: 2, performance: { correct: 2, total: 8 } },
      { subjectId: 2, srsStage: 7, wkLevel: 20, performance: { correct: 18, total: 20 } },
    ];

    expect(sortReviewsByDifficulty(items, "easiest", NOW_MS).map((item) => item.subjectId)).toEqual([2, 1]);
    expect(sortReviewsByDifficulty(items, "hardest", NOW_MS).map((item) => item.subjectId)).toEqual([1, 2]);
  });

  it("smooths sparse success history toward a neutral prior", () => {
    const oneSuccess = reviewEaseScore({
      subjectId: 1,
      srsStage: 1,
      wkLevel: 60,
      performance: { correct: 1, total: 1 },
    }, NOW_MS);
    const provenSuccess = reviewEaseScore({
      subjectId: 2,
      srsStage: 1,
      wkLevel: 60,
      performance: { correct: 20, total: 20 },
    }, NOW_MS);

    expect(provenSuccess).toBeGreaterThan(oneSuccess);
  });

  it("uses recent Guru passage as a small tie-break signal", () => {
    const recent = reviewEaseScore({
      subjectId: 1,
      srsStage: 5,
      wkLevel: 10,
      passedAt: new Date(NOW_MS - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }, NOW_MS);
    const old = reviewEaseScore({
      subjectId: 2,
      srsStage: 5,
      wkLevel: 10,
      passedAt: new Date(NOW_MS - 180 * 24 * 60 * 60 * 1000).toISOString(),
    }, NOW_MS);

    expect(recent).toBeGreaterThan(old);
  });
});