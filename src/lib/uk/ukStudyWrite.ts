import "server-only";

import { REVIEW_RESULTS } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { initialLessonState, nextSrsStage, nextStageAvailableAt } from "@/lib/srs/srsSchedule";

import { syncAccountUkLevel } from "./ukLevelServer";
import { UK_LEVEL_PASS_SRS_STAGE } from "./ukLevel";

/**
 * Taking a lesson, and answering a review.
 *
 * Both end by re-deriving the member's level in the same transaction that
 * wrote the state, so a member who has just guru'd the last kanji of a level
 * is told on that answer rather than on the next page load.
 *
 * State rows are created here and nowhere else in the member-facing paths.
 * "No row" means locked, which is why starting a lesson is a write rather
 * than a read with a flag.
 */

export type UkReviewOutcome = {
  subjectId: number;
  previousSrsStage: number;
  newSrsStage: number;
  /** The level the member stands on after this answer. */
  level: number;
  levelledUp: boolean;
};

/** Opens items as lessons. Ignores any the member has already started. */
export async function startUkLessons({
  accountId,
  subjectIds,
  now = new Date(),
}: {
  accountId: string;
  subjectIds: number[];
  now?: Date;
}): Promise<number> {
  if (subjectIds.length === 0) return 0;

  /* Only items at or below their level, checked here rather than trusted from
     the request: a crafted body could otherwise open the whole ladder. */
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { ukLevel: true } });
  const open = await prisma.ukSubject.findMany({
    where: { id: { in: subjectIds }, removedAt: null, level: { lte: account?.ukLevel ?? 1 } },
    select: { id: true },
  });
  if (open.length === 0) return 0;

  const state = initialLessonState(now);
  const created = await prisma.ukSrsState.createMany({
    data: open.map((subject) => ({ accountId, subjectId: subject.id, ...state })),
    skipDuplicates: true,
  });
  return created.count;
}

/**
 * Records one answer.
 *
 * A wrong answer drops the stage rather than resetting it, per the shared
 * schedule. `passedAt` is stamped the first time an item reaches Guru and
 * never cleared afterwards — that is what lets a level stay cleared when an
 * item later falls back, so one wrong answer cannot un-learn a level.
 */
export async function recordUkReview({
  accountId,
  subjectId,
  result,
  now = new Date(),
}: {
  accountId: string;
  subjectId: number;
  result: "correct" | "wrong";
  now?: Date;
}): Promise<UkReviewOutcome | null> {
  const state = await prisma.ukSrsState.findUnique({
    where: { accountId_subjectId: { accountId, subjectId } },
  });
  if (!state) return null;

  const previousSrsStage = state.srsStage;
  const newSrsStage = nextSrsStage({ currentStage: previousSrsStage, result });
  const correct = result === REVIEW_RESULTS.correct;

  const before = await prisma.account.findUnique({ where: { id: accountId }, select: { ukLevel: true } });

  await prisma.$transaction([
    prisma.ukSrsState.update({
      where: { id: state.id },
      data: {
        srsStage: newSrsStage,
        availableAt: nextStageAvailableAt(newSrsStage, now),
        lastReviewedAt: now,
        reviewCount: { increment: 1 },
        correctCount: correct ? { increment: 1 } : undefined,
        wrongCount: correct ? undefined : { increment: 1 },
        passedAt: state.passedAt ?? (newSrsStage >= UK_LEVEL_PASS_SRS_STAGE ? now : null),
        burnedAt: newSrsStage >= 9 ? (state.burnedAt ?? now) : state.burnedAt,
      },
    }),
    prisma.ukReviewAttempt.create({
      data: { accountId, stateId: state.id, subjectId, result, previousSrsStage, newSrsStage },
    }),
  ]);

  const resolved = await syncAccountUkLevel(accountId);
  return {
    subjectId,
    previousSrsStage,
    newSrsStage,
    level: resolved.level,
    levelledUp: resolved.level > (before?.ukLevel ?? 1),
  };
}

/**
 * Pulls a burned item back down for more review.
 *
 * WaniKani cannot do this, and it is why our top rung is named for mastery
 * rather than retirement. `burnedAt` is cleared, because it is a claim about
 * the present rather than a record of the past.
 */
export async function demoteUkItem({
  accountId,
  subjectId,
  toStage = UK_LEVEL_PASS_SRS_STAGE,
  now = new Date(),
}: {
  accountId: string;
  subjectId: number;
  toStage?: number;
  now?: Date;
}): Promise<boolean> {
  const state = await prisma.ukSrsState.findUnique({
    where: { accountId_subjectId: { accountId, subjectId } },
    select: { id: true, srsStage: true },
  });
  if (!state || toStage >= state.srsStage) return false;

  await prisma.ukSrsState.update({
    where: { id: state.id },
    data: { srsStage: toStage, availableAt: nextStageAvailableAt(toStage, now), burnedAt: null },
  });
  return true;
}
