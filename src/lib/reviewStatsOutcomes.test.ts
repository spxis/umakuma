import { describe, expect, it } from "vitest";

import {
  buildReviewOutcomeSeries,
  summarizeReviewOutcomes,
} from "@/lib/reviewStatsOutcomes";

describe("summarizeReviewOutcomes", () => {
  it("counts each review once using its combined answer result", () => {
    expect(
      summarizeReviewOutcomes([
        { result: "correct" },
        { result: "wrong" },
        { result: "wrong" },
      ]),
    ).toEqual({ success: 1, failure: 2 });
  });

  it("treats a review with no incorrect answers as one success", () => {
    expect(summarizeReviewOutcomes([{ result: "correct" }])).toEqual({
      success: 1,
      failure: 0,
    });
  });

  it("does not treat skipped reviews as outcomes", () => {
    expect(summarizeReviewOutcomes([{ result: "skipped" }])).toEqual({
      success: 0,
      failure: 0,
    });
  });

  it("builds cumulative success and failure counts", () => {
    expect(
      buildReviewOutcomeSeries([
        { result: "wrong" as const, submittedAt: "first" },
        { result: "skipped" as const, submittedAt: "skipped" },
        { result: "correct" as const, submittedAt: "last" },
      ]),
    ).toEqual([
      { result: "wrong", submittedAt: "first", success: 0, failure: 1, total: 1 },
      { result: "correct", submittedAt: "last", success: 1, failure: 1, total: 2 },
    ]);
  });
});