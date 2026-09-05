import "server-only";

import { REVIEW_RESULTS } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { initialLessonState, nextSrsStage, nextStageAvailableAt, SRS_BURNED_STAGE } from "@/lib/srs/srsSchedule";
import { settleDailyXp } from "@/lib/xp/xpDayServer";
import { awardXpQuietly } from "@/lib/xp/xpServer";
import { lessonXpAwards, reviewXpAwards } from "@/lib/xp/xpStudyAwards";

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
 *
 * Both also award XP, and neither can fail because of it. XP is bookkeeping
 * that sits beside the study rather than a condition of it: an answer that
 * scores correctly and cannot record its XP is still a completed answer, so
 * the awarding goes through `awardXpQuietly`, after the transaction that wrote
 * the state has already committed.
 *
 * `settleDailyXp` follows it for the same reason and under the same rule. The
 * awards above are what this action was worth; that call is what the *day* has
 * become because of it - a sign-in, a streak that has just reached thirty, a
 * quest whose fiftieth review this was. It swallows its own failures too.
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

  /* Per item actually started, not per item asked for: `skipDuplicates` means
     a resent request opens nothing, and it should pay for nothing. */
  await awardXpQuietly({ accountId, requests: lessonXpAwards(created.count), now });
  await settleDailyXp({ accountId, now });
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
  /* The first arrival at the top stage, which is what earns the bonus. An item
     pulled back down and re-burned keeps its original `burnedAt`, so it cannot
     be farmed by demoting and re-climbing. */
  const burnedNow = newSrsStage >= SRS_BURNED_STAGE && state.burnedAt === null;

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
        burnedAt: burnedNow ? now : state.burnedAt,
      },
    }),
    prisma.ukReviewAttempt.create({
      data: { accountId, stateId: state.id, subjectId, result, previousSrsStage, newSrsStage },
    }),
  ]);

  const resolved = await syncAccountUkLevel(accountId);
  const levelBefore = before?.ukLevel ?? 1;

  await awardXpQuietly({
    accountId,
    requests: reviewXpAwards({ correct, burnedNow, levelBefore, levelAfter: resolved.level }),
    now,
  });
  await settleDailyXp({ accountId, now });

  return {
    subjectId,
    previousSrsStage,
    newSrsStage,
    level: resolved.level,
    levelledUp: resolved.level > levelBefore,
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
