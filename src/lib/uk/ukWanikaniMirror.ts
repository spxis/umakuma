import type { AssignmentCacheRow } from "@/lib/wanikani/types";
import { REVIEW_RESULTS, type ReviewResult } from "@/lib/domainConstants";

/**
 * What a UK review means to the member's WaniKani account, decided from the
 * cached assignment alone.
 *
 * WaniKani does not import reviews, so a member who reviews here and keeps a
 * WaniKani account would fall behind there for every answer given here. The
 * mirror sends the same answer to both: a review when WaniKani is waiting for
 * one on that item, a lesson start when WaniKani has unlocked it and nothing
 * more - and nothing at all when the item is not yet unlocked there, or is
 * not due, because WaniKani refuses a review on an item it is not asking
 * about and the refusal would only be noise.
 */
export const MIRROR_ACTIONS = { review: "review", start: "start" } as const;
export type MirrorAction = (typeof MIRROR_ACTIONS)[keyof typeof MIRROR_ACTIONS];

export function mirrorActionFor(row: AssignmentCacheRow, now: Date): { action: MirrorAction; assignmentId: number } | null {
  const data = row.data;
  const startedAt = typeof data.started_at === "string" ? Date.parse(data.started_at) : null;
  const unlockedAt = typeof data.unlocked_at === "string" ? Date.parse(data.unlocked_at) : null;
  const availableAt = typeof data.available_at === "string" ? Date.parse(data.available_at) : null;
  const burned = typeof data.burned_at === "string";
  if (burned) return null;
  if (startedAt !== null) {
    return availableAt !== null && availableAt <= now.getTime() ? { action: MIRROR_ACTIONS.review, assignmentId: row.id } : null;
  }
  if (unlockedAt !== null) return { action: MIRROR_ACTIONS.start, assignmentId: row.id };
  return null;
}

/**
 * A UK review has one verdict for the whole item; WaniKani scores meaning and
 * reading apart. A miss is reported on both halves, which WaniKani penalises
 * exactly as it penalises one - its adjustment is ceil(incorrect / 2) - so
 * the honest answer ("we do not know which half") costs the member nothing
 * extra.
 */
export function mirrorReviewBody(assignmentId: number, result: ReviewResult) {
  const incorrect = result === REVIEW_RESULTS.wrong ? 1 : 0;
  return { review: { assignment_id: assignmentId, incorrect_meaning_answers: incorrect, incorrect_reading_answers: incorrect } };
}

/** The cached assignment for a WaniKani subject, if the member has one. */
export function assignmentForSubject(rows: AssignmentCacheRow[], wkSubjectId: number): AssignmentCacheRow | null {
  return rows.find((row) => row.data.subject_id === wkSubjectId) ?? null;
}
