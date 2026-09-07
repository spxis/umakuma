import "server-only";

import { Prisma, type StudyReviewResult } from "@prisma/client";

import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { prisma } from "@/lib/prisma";
import { ladderColumns } from "@/lib/uk/ladderColumns";
import { syncAccountLevels } from "@/lib/uk/unLevelServer";

import type { CohortMember, CohortStateRow } from "./cohortStudy";

/**
 * Writing a simulated member back: what they studied, and where that leaves
 * them.
 *
 * Split out of `cohortStore.ts` when it crossed the file-size gate. Reading a
 * member and writing one are the two halves of that file and they share
 * nothing but the client, so this is where it wanted to come apart.
 */

/** Rows per statement. Enough to be few round trips, small enough to send. */
const CHUNK = 1_000;

/**
 * The Prisma client or a transaction of it, so a write can be composed either
 * way. Prisma's transaction client has every model and no `$transaction`.
 */
type CohortDb = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

function stateCreate(accountId: string, state: CohortStateRow): Prisma.UkSrsStateCreateManyInput {
  return {
    accountId,
    subjectId: state.subjectId,
    srsStage: state.srsStage,
    availableAt: state.availableAt,
    unlockedAt: state.unlockedAt,
    startedAt: state.startedAt,
    passedAt: state.passedAt,
    burnedAt: state.burnedAt,
    lastReviewedAt: state.lastReviewedAt,
    reviewCount: state.reviewCount,
    correctCount: state.correctCount,
    wrongCount: state.wrongCount,
    origin: state.origin,
    createdAt: state.startedAt,
    updatedAt: state.lastReviewedAt ?? state.startedAt,
  };
}

/** One statement per chunk, however many rows moved. */
async function updateStates(db: CohortDb, rows: readonly CohortStateRow[]): Promise<void> {
  for (let at = 0; at < rows.length; at += CHUNK) {
    const chunk = rows.slice(at, at + CHUNK);
    await db.$executeRaw`
      UPDATE "UkSrsState" AS s SET
        "srsStage" = v.stage, "availableAt" = v.available_at, "passedAt" = v.passed_at,
        "burnedAt" = v.burned_at, "lastReviewedAt" = v.last_reviewed_at, "reviewCount" = v.review_count,
        "correctCount" = v.correct_count, "wrongCount" = v.wrong_count, "updatedAt" = v.updated_at
      FROM (VALUES ${Prisma.join(chunk.map((row) => Prisma.sql`(
        ${row.id}::int, ${row.srsStage}::int, ${row.availableAt}::timestamptz, ${row.passedAt}::timestamptz,
        ${row.burnedAt}::timestamptz, ${row.lastReviewedAt}::timestamptz, ${row.reviewCount}::int,
        ${row.correctCount}::int, ${row.wrongCount}::int, ${row.lastReviewedAt ?? row.startedAt}::timestamptz
      )`))}) AS v(id, stage, available_at, passed_at, burned_at, last_reviewed_at, review_count, correct_count, wrong_count, updated_at)
      WHERE s.id = v.id`;
  }
}

/**
 * Writes the study half - state rows, the answers that produced them, the
 * finals sat - **and the resume point, in the same commit**.
 *
 * The two must land together. `playMember` decides what to replay from
 * `Account.lastActivityAt`, and that used to be written at the very end, in
 * `saveStanding`, several statements and every game later. Kill the process in
 * between and the member had answers on disk but had not advanced, so the next
 * run replayed the same days - and `UkReviewAttempt` has no unique key, so it
 * wrote every one of those answers a second time. Unattended on a schedule
 * that is not a crash, it is silent corruption: the boards still look fine.
 *
 * A transaction is possible here and nowhere wider, because everything in it
 * is a plain statement. `playGame` cannot join it: `planGameRun` opens a
 * `$transaction` of its own and Prisma does not nest them.
 *
 * So a killed run can still lose this tick's games, and that is deliberate.
 * Losing them costs a few rows that are never written; duplicating answers
 * costs the truth of every board. XP survives either way - `saveStanding`
 * replaces a day's rows rather than adding to them.
 */
export async function saveStudy(
  accountId: string,
  member: CohortMember,
  /** Where the member has now been simulated to. Committed with the rows. */
  advanceTo: Date | null = member.lastActivityAt,
): Promise<{ states: number; attempts: number; tests: number }> {
  return prisma.$transaction(
    async (tx) => writeStudy(tx, accountId, member, advanceTo),
    /* A first replay is a year of one member - a few thousand rows in chunks
       of 500. Seconds in practice, and the default five is not enough. */
    { timeout: 120_000, maxWait: 15_000 },
  );
}

async function writeStudy(
  db: CohortDb,
  accountId: string,
  member: CohortMember,
  advanceTo: Date | null,
): Promise<{ states: number; attempts: number; tests: number }> {
  const fresh = [...member.states.values()].filter((state) => state.id === null);
  const moved = [...member.states.values()].filter((state) => state.id !== null && state.dirty);

  for (let at = 0; at < fresh.length; at += CHUNK) {
    await db.ukSrsState.createMany({
      data: fresh.slice(at, at + CHUNK).map((state) => stateCreate(accountId, state)),
      skipDuplicates: true,
    });
  }
  await updateStates(db, moved);

  if (fresh.length > 0) {
    const ids = await db.ukSrsState.findMany({ where: { accountId }, select: { id: true, subjectId: true } });
    for (const row of ids) {
      const state = member.states.get(row.subjectId);
      if (state) state.id = row.id;
    }
  }
  for (const state of member.states.values()) state.dirty = false;

  const attempts = member.attempts.flatMap((attempt) => {
    const stateId = member.states.get(attempt.subjectId)?.id;
    if (!stateId) return [];
    return [{
      accountId,
      stateId,
      subjectId: attempt.subjectId,
      result: attempt.result as StudyReviewResult,
      previousSrsStage: attempt.previousSrsStage,
      newSrsStage: attempt.newSrsStage,
      submittedAt: attempt.submittedAt,
      curriculumStream: attempt.curriculumStream,
      curriculumVersion: attempt.curriculumVersion,
    }];
  });
  for (let at = 0; at < attempts.length; at += CHUNK) {
    await db.ukReviewAttempt.createMany({ data: attempts.slice(at, at + CHUNK) });
  }

  /* The finals they sat. `skipDuplicates` because a re-run replays no day
     twice but a member's cleared gates are loaded back, so the same attempt
     number must not be written again. */
  if (member.tests.length > 0) {
    await db.levelTest.createMany({
      data: member.tests.map((test) => ({
        accountId,
        kind: "jlpt_final" as const,
        gateKey: test.gateKey,
        attempt: test.attempt,
        level: test.level,
        questionCount: test.questionCount,
        threshold: test.threshold,
        mustPass: true,
        answeredCount: test.questionCount,
        correctCount: test.correctCount,
        verdict: test.verdict,
        curriculumVersion: CURRICULUM_VERSION,
        startedAt: test.satAt,
        completedAt: test.satAt,
      })),
      skipDuplicates: true,
    });
  }

  /* The resume point, last inside the commit. Nothing above it is visible to
     another connection until this lands with it. */
  if (advanceTo !== null) {
    await db.account.update({ where: { id: accountId }, data: { lastActivityAt: advanceTo } });
  }

  const written = { states: fresh.length + moved.length, attempts: attempts.length, tests: member.tests.length };
  member.attempts = [];
  member.tests = [];
  return written;
}

/** Writes the XP half and the account's standing. Every day this run touched is replaced whole. */
export async function saveStanding(accountId: string, member: CohortMember): Promise<number> {
  const days = [...member.ledger.touchedDays];
  const rows = member.ledger.touchedRows();
  if (days.length > 0) {
    await prisma.xpEvent.deleteMany({ where: { accountId, dayKey: { in: days } } });
    for (let at = 0; at < rows.length; at += CHUNK) {
      await prisma.xpEvent.createMany({
        data: rows.slice(at, at + CHUNK).map((row) => ({ accountId, ...row })),
      });
    }
  }

  /* The inputs only. The floor, the placement and when they placed are
     things a member did; the level is derived from them and from the states
     written above, and it has exactly one writer - which used to be two,
     because this block set `unLevel` itself and the guard for that matched
     only a block that *opened* with it. Floor first, then the sync, since the
     resolver reads the floor. The sync writes both ladders' standings, so a
     cohort run no longer leaves `ugLevel` stale beside a fresh `unLevel`. */
  await prisma.account.update({
    where: { id: accountId },
    data: {
      xp: member.ledger.xp,
      xpLevel: member.ledger.xpLevel,
      /* The floor and the placement are inputs, and they belong to the ladder
         this member follows - a placement on UG says nothing about where they
         would start on UN. `syncAccountLevels` below derives both standings,
         each against its own floor. */
      ...(ladderColumns(member.persona.stream).stream === LADDER_STREAMS.ug
        ? { ugLevelFloor: member.floor, ugPlacedAt: member.placedAt }
        : { unLevelFloor: member.floor, unPlacedAt: member.placedAt, unPlacementSource: member.placedAt ? "placement_test" as const : undefined }),
      lastActivityAt: member.lastActivityAt,
    },
  });
  await syncAccountLevels(accountId);
  member.ledger.touchedDays.clear();
  return rows.length;
}


/**
 * One round: planned by the site, played by the persona, scored by the site.
 *
 * Written in one statement with its answers already in, dated when it was
 * played. A pool that cannot fill a round - a category with nothing in it at
 * that level, a Daily Challenge already taken - is a round not played, which
 * is what it would have been for a person too.
 */
