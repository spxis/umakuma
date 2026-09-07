import "server-only";

import { prisma } from "@/lib/prisma";
import { REVIEW_RESULTS } from "@/lib/domainConstants";
import {
  diffReviewStats,
  parseReviewStatSnapshot,
  type ReviewStatRow,
  type ReviewStatSnapshot,
} from "@/lib/wanikani/reviewStatDeltas";
import type { AssignmentCacheRow } from "@/lib/wanikani/types";

/**
 * The reviews a member answered on WaniKani, written into their history here.
 *
 * John: "My reviews are not showing up in my History!!! last was 2 days ago,
 * which I did in the Wanikani app." They never could: a `StudyReviewAttempt`
 * was written in exactly one place, the review route, when somebody answers
 * on this site - so History was "what you did here" while calling itself your
 * study history.
 *
 * And it cannot be fixed by reading their reviews, because there are none to
 * read: WaniKani's `/reviews` collection logs only what was submitted through
 * the API, and came back `total_count` 0 for an account with 2,774 review
 * statistics updated that same morning. The counters are the whole record,
 * so `diffReviewStats` infers the reviews and this writes them down.
 *
 * Every row is marked `wanikani`, because a reconstruction is not the same
 * kind of fact as an answer we watched being given, and a member reading
 * their own history is entitled to know which is which.
 */
export type WanikaniReviewIngest = {
  snapshot: ReviewStatSnapshot;
  written: number;
};

/** Where a subject's assignment is, for the two columns an attempt needs. */
function assignmentsBySubject(rows: unknown): Map<number, { assignmentId: number; subjectType: string }> {
  const found = new Map<number, { assignmentId: number; subjectType: string }>();
  if (!Array.isArray(rows)) return found;

  for (const entry of rows as AssignmentCacheRow[]) {
    const data = entry?.data;
    if (!data || typeof data.subject_id !== "number" || typeof data.subject_type !== "string") continue;
    found.set(data.subject_id, { assignmentId: entry.id, subjectType: data.subject_type });
  }

  return found;
}

export async function recordWanikaniReviews(params: {
  accountId: string;
  previous: unknown;
  rows: readonly ReviewStatRow[];
  assignments: unknown;
  seenAt: Date;
}): Promise<WanikaniReviewIngest> {
  const previous = parseReviewStatSnapshot(params.previous);
  const { attempts, snapshot } = diffReviewStats(previous, params.rows, params.seenAt);
  if (attempts.length === 0) return { snapshot, written: 0 };

  /*
   * A subject with no assignment is skipped rather than written with a zero.
   * `assignmentId` is what a row is joined back to; inventing one would put a
   * review in the history that leads nowhere. In practice every reviewed
   * subject has an assignment - that is what made it reviewable.
   */
  const assignments = assignmentsBySubject(params.assignments);
  const rows = attempts.flatMap((attempt) => {
    const assignment = assignments.get(attempt.subjectId);
    if (!assignment) return [];

    return [{
      accountId: params.accountId,
      assignmentId: assignment.assignmentId,
      subjectId: attempt.subjectId,
      subjectType: assignment.subjectType,
      result: attempt.result === REVIEW_RESULTS.wrong ? REVIEW_RESULTS.wrong : REVIEW_RESULTS.correct,
      source: "wanikani" as const,
      submittedAt: attempt.at,
    }];
  });

  if (rows.length > 0) {
    await prisma.studyReviewAttempt.createMany({ data: rows });
  }

  return { snapshot, written: rows.length };
}
