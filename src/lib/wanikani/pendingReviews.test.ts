import { describe, expect, it } from "vitest";

import { countPendingReviews } from "./pendingReviews";

describe("countPendingReviews", () => {
  it("counts only review groups available now", () => {
    expect(countPendingReviews({
      data: {
        reviews: [
          { available_at: "2026-07-23T11:00:00.000Z", subject_ids: [1, 2] },
          { available_at: "2026-07-23T12:00:00.000Z", subject_ids: [3] },
          { available_at: "2026-07-23T13:00:00.000Z", subject_ids: [4, 5, 6] },
        ],
      },
    }, new Date("2026-07-23T12:00:00.000Z"))).toBe(3);
  });

  it("returns zero after reviews are cleared", () => {
    expect(countPendingReviews({ data: { reviews: [] } })).toBe(0);
  });
});