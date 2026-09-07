import "server-only";

import { REVIEW_RESULTS } from "@/lib/domainConstants";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { prisma } from "@/lib/prisma";
import { initialLessonState, nextSrsStage, nextStageAvailableAt, SRS_BURNED_STAGE } from "@/lib/srs/srsSchedule";
import { settleDailyXp } from "@/lib/xp/xpDayServer";
import { awardXpQuietly } from "@/lib/xp/xpServer";
import { lessonXpAwards, reviewXpAwards, XP_REASONS } from "@/lib/xp/xpStudyAwards";
import type { XpEarned } from "@/lib/xp/xpToast";

import { ladderColumns } from "./ladderColumns";
import { syncAccountLevels } from "./unLevelServer";
import { UN_LEVEL_PASS_SRS_STAGE } from "./unLevel";

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
  /** What this answer paid, so the page can say so on the answer itself. */
  xpAwarded: number;
  earned: XpEarned;
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
}): Promise<{ started: number; earned: XpEarned }> {
  const nothing = { started: 0, earned: [] as XpEarned };
  if (subjectIds.length === 0) return nothing;

  /* Only items at or below their level on the ladder they follow, checked
     here rather than trusted from the request: a crafted body could otherwise
     open the whole ladder. It read `unLevel` and `level` for everyone before,
     so a UG member's lessons were gated by the JLPT ordering. */
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { ladderStream: true, unLevel: true, ugLevel: true },
  });
  const columns = ladderColumns(account?.ladderStream ?? LADDER_STREAMS.un);
  const open = await prisma.ukSubject.findMany({
    where: { id: { in: subjectIds }, removedAt: null, [columns.subjectLevel]: { lte: account?.[columns.accountLevel] ?? 1 } },
    select: { id: true },
  });
  if (open.length === 0) return nothing;

  const state = initialLessonState(now);
  const created = await prisma.ukSrsState.createMany({
    data: open.map((subject) => ({ accountId, subjectId: subject.id, ...state })),
    skipDuplicates: true,
  });

  /* Per item actually started, not per item asked for: `skipDuplicates` means
     a resent request opens nothing, and it should pay for nothing. */
  const lessonXp = await awardXpQuietly({ accountId, requests: lessonXpAwards(created.count), now });
  const dayXp = await settleDailyXp({ accountId, now });

  const earned: XpEarned = [];
  if (lessonXp > 0) earned.push({ xp: lessonXp, reason: XP_REASONS.lesson });
  if (dayXp > 0) earned.push({ xp: dayXp, reason: XP_REASONS.today });
  return { started: created.count, earned };
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

  /* The member's own stream, read here rather than assumed: it is what the
     answer is stamped with, and it comes back on the row this already fetches
     rather than costing a second query. */
  const before = await prisma.account.findUnique({
    where: { id: accountId },
    select: { unLevel: true, ugLevel: true, ladderStream: true },
  });
  const columns = ladderColumns(before?.ladderStream ?? LADDER_STREAMS.un);

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
        passedAt: state.passedAt ?? (newSrsStage >= UN_LEVEL_PASS_SRS_STAGE ? now : null),
        burnedAt: burnedNow ? now : state.burnedAt,
      },
    }),
    prisma.ukReviewAttempt.create({
      /*
       * Stamped with the curriculum it was answered against. The ladders move
       * when the evidence says to - a kanji shifts a level, a word is placed
       * differently - and an answer given against one arrangement should still
       * be readable after the arrangement changes.
       *
       * **The member's own stream, not UN.** It was hardcoded to UN while
       * nobody could choose UG, and stayed hardcoded after `ladderStream`
       * shipped - so every UG member's answers claimed to have been given
       * against a ladder they are not on. The two ladders order the same 2,235
       * kanji differently, so that is not a label being slightly wrong: it is
       * an answer filed against the wrong question, and no board reading these
       * rows could tell.
       */
      data: {
        accountId,
        stateId: state.id,
        subjectId,
        result,
        previousSrsStage,
        newSrsStage,
        submittedAt: now,
        curriculumStream: before?.ladderStream ?? LADDER_STREAMS.un,
        curriculumVersion: CURRICULUM_VERSION,
      },
    }),
  ]);

  /* Both standings move; the one reported back is on the ladder they follow,
     and so is the "before" it is compared with. */
  const resolved = await syncAccountLevels(accountId);
  const levelBefore = before?.[columns.accountLevel] ?? 1;

  const xpAwarded = await awardXpQuietly({
    accountId,
    requests: reviewXpAwards({ correct, burnedNow, levelBefore, levelAfter: resolved.level }),
    now,
  });
  const dayXp = await settleDailyXp({ accountId, now });

  const earned: XpEarned = [];
  if (xpAwarded > 0) earned.push({ xp: xpAwarded, reason: XP_REASONS.review });
  if (dayXp > 0) earned.push({ xp: dayXp, reason: XP_REASONS.today });

  return {
    subjectId,
    previousSrsStage,
    newSrsStage,
    level: resolved.level,
    levelledUp: resolved.level > levelBefore,
    /* What this answer paid, so the page can say so on the answer itself. */
    xpAwarded,
    earned,
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
  toStage = UN_LEVEL_PASS_SRS_STAGE,
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
