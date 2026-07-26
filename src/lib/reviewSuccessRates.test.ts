import { describe, expect, it } from "vitest";

import { calculateReviewSuccessRates } from "@/lib/reviewSuccessRates";

describe("calculateReviewSuccessRates", () => {
  it("counts each binary review once per subject", () => {
    const rates = calculateReviewSuccessRates([
      { subjectId: 1, result: "wrong" },
      { subjectId: 1, result: "wrong" },
      { subjectId: 1, result: "correct" },
      { subjectId: 2, result: "correct" },
    ]);

    expect(rates.get(1)).toBe(33);
    expect(rates.get(2)).toBe(100);
  });

  it("returns no rate when no reviews exist", () => {
    expect(calculateReviewSuccessRates([]).size).toBe(0);
  });
});