import { describe, expect, it } from "vitest";

import { resolveReadingReviewCredit } from "./readingSignoffsRoute.reviewQueue";

describe("resolveReadingReviewCredit", () => {
  it("grants credit when WaniKani is submitted with a live zero queue", () => {
    expect(resolveReadingReviewCredit({
      requested: true,
      pendingReviews: 0,
      alreadyGranted: false,
    })).toEqual({ grantedNow: true, grantedForDay: true, reviewsLeftForDay: 0 });
  });

  it("does not grant credit from a reading-only submission", () => {
    expect(resolveReadingReviewCredit({
      requested: false,
      pendingReviews: 0,
      alreadyGranted: false,
    })).toEqual({ grantedNow: false, grantedForDay: false, reviewsLeftForDay: 0 });
  });

  it("does not grant the same day's credit twice", () => {
    expect(resolveReadingReviewCredit({
      requested: true,
      pendingReviews: 0,
      alreadyGranted: true,
    })).toEqual({ grantedNow: false, grantedForDay: true, reviewsLeftForDay: 0 });
  });
});