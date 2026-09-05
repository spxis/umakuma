import { describe, expect, it } from "vitest";

import { REVIEW_RESULTS } from "@/lib/domainConstants";
import type { AssignmentCacheRow } from "@/lib/wanikani/types";

import { assignmentForSubject, mirrorActionFor, mirrorReviewBody } from "./ukWanikaniMirror";

const now = new Date("2026-09-05T12:00:00Z");
const row = (data: Record<string, unknown>, id = 7): AssignmentCacheRow => ({ id, data: { subject_id: 440, ...data } });

describe("what a UK review means to WaniKani", () => {
  it("is a review when WaniKani is waiting for one", () => {
    expect(mirrorActionFor(row({ started_at: "2026-09-01T00:00:00Z", available_at: "2026-09-05T11:00:00Z" }), now)).toEqual({ action: "review", assignmentId: 7 });
  });

  it("is nothing while the item is not yet due there", () => {
    expect(mirrorActionFor(row({ started_at: "2026-09-01T00:00:00Z", available_at: "2026-09-06T00:00:00Z" }), now)).toBeNull();
  });

  it("is a lesson start when WaniKani has unlocked it and no more", () => {
    expect(mirrorActionFor(row({ unlocked_at: "2026-09-04T00:00:00Z" }), now)).toEqual({ action: "start", assignmentId: 7 });
  });

  it("is nothing for an item WaniKani has not unlocked, or has burned", () => {
    expect(mirrorActionFor(row({}), now)).toBeNull();
    expect(mirrorActionFor(row({ started_at: "2025-01-01T00:00:00Z", available_at: "2025-06-01T00:00:00Z", burned_at: "2026-01-01T00:00:00Z" }), now)).toBeNull();
  });

  /* WaniKani's penalty is ceil(incorrect / 2): two halves wrong cost the same
     step as one, so reporting a miss on both is honest and not harsher. */
  it("reports a miss on both halves and a hit on neither", () => {
    expect(mirrorReviewBody(7, REVIEW_RESULTS.wrong).review).toEqual({ assignment_id: 7, incorrect_meaning_answers: 1, incorrect_reading_answers: 1 });
    expect(mirrorReviewBody(7, REVIEW_RESULTS.correct).review).toEqual({ assignment_id: 7, incorrect_meaning_answers: 0, incorrect_reading_answers: 0 });
  });

  it("finds the member's assignment for a subject", () => {
    expect(assignmentForSubject([row({}, 1), row({ subject_id: 9 }, 2)], 9)?.id).toBe(2);
    expect(assignmentForSubject([row({}, 1)], 9)).toBeNull();
  });
});
