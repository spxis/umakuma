import "server-only";

import { accuracyOf, gradeFor, type ListGrade } from "./listGrade";
import { LIST_STANDINGS, standingFor } from "./listProgress";
import { prisma } from "./prisma";
import { parseAssignmentCacheRows } from "./wanikani/helpers";

/**
 * How this reader is doing on this list.
 *
 * The reader's own, not the owner's - the same choice `loadMemberState` makes,
 * and for the same reason: opening a friend's list should say how far *you*
 * have got with what is on it, which is the only number you can act on.
 *
 * Coverage comes from the assignment cache, accuracy from the self-graded
 * review attempts, and both are counted only over the items the catalogue
 * names. A word WaniKani never taught has no stage in anybody's account and no
 * attempt row, so counting it would mark a list down for holding something
 * somebody typed in by hand.
 */

export type ListGradeFacts = {
  grade: ListGrade;
  known: number;
  trackable: number;
  /** Null when this reader has never been reviewed on any of it. */
  accuracy: number | null;
  /** How many attempts that accuracy rests on, so a single answer can say so. */
  attempts: number;
};

const REVIEW_CORRECT = "correct";

export async function loadListGrade(
  accountId: string | null,
  subjectIds: readonly (number | null)[],
): Promise<ListGradeFacts | null> {
  const tracked = [...new Set(subjectIds.filter((id): id is number => typeof id === "number" && id > 0))];
  if (!accountId || tracked.length === 0) return null;

  const [account, attempts] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { assignmentCache: true } }),
    prisma.studyReviewAttempt
      .groupBy({ by: ["result"], where: { accountId, subjectId: { in: tracked } }, _count: { _all: true } })
      .catch(() => []),
  ]);

  let known = 0;
  const stages = new Map<number, { srsStage: number; unlocked: boolean }>();
  for (const row of parseAssignmentCacheRows(account?.assignmentCache)) {
    const subjectId = row.data.subject_id;
    if (typeof subjectId !== "number") continue;
    stages.set(subjectId, {
      srsStage: typeof row.data.srs_stage === "number" ? row.data.srs_stage : 0,
      unlocked: Boolean(row.data.unlocked_at),
    });
  }
  for (const subjectId of tracked) {
    if (standingFor(stages.get(subjectId)) === LIST_STANDINGS.known) known += 1;
  }

  const tally = attempts.reduce(
    (running, row) => ({
      correct: running.correct + (row.result === REVIEW_CORRECT ? row._count._all : 0),
      total: running.total + row._count._all,
    }),
    { correct: 0, total: 0 },
  );

  return {
    grade: gradeFor(known, tracked.length),
    known,
    trackable: tracked.length,
    accuracy: accuracyOf(tally),
    attempts: tally.total,
  };
}
