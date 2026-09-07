import "server-only";

import {
  Prisma,
  type GameKind as PrismaGameKind,
  type GameSubjectCategory,
  type StudyReviewResult,
} from "@prisma/client";

import { ACCOUNT_APPROVAL } from "@/lib/accountApproval";
import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { completedRunValues } from "@/lib/gameModeServer";
import { planGameRun, type GameRunRequest } from "@/lib/gameRunCreate";
import { prisma } from "@/lib/prisma";
import { syncAccountLevels, unLevelTotals } from "@/lib/uk/unLevelServer";
import { USER_TYPES } from "@/lib/userType";
import { GAME_KIND_LABELS } from "@/app/game/GameMode.constants";
import { gameXpAwards } from "@/lib/xp/xpGameAwards";

import { sessionRandom } from "./cohortDays";
import { playRun } from "./cohortGames";
import { CohortLedger } from "./cohortLedger";
import { derivePersona, personaFor, type CohortPersona, type NewCohortMember } from "./cohortPersona";
import { dueStates, resolvedLevel, type CohortMember, type CohortStateRow, type CohortWorld } from "./cohortStudy";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { ladderColumns } from "@/lib/uk/ladderColumns";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";

/**
 * The cohort's rows: reading a member out of the database and writing what
 * the simulation did back in.
 *
 * Writes are bulk on purpose. A member's first hundred days are a few
 * thousand state rows and answers, and thirty-two members at a round trip
 * per row would take most of an hour against a database in Virginia. So new
 * rows go in with `createMany`, changed rows in one `UPDATE ... FROM (VALUES)`
 * per chunk, and a day's XP is replaced whole rather than patched.
 */

const CHUNK = 1_000;

export async function loadWorld(): Promise<CohortWorld> {
  const [subjects, un, ug] = await Promise.all([
    prisma.ukSubject.findMany({
      where: { removedAt: null },
      /* Both levels: a member's standing is derived on both ladders, and the
         two put different subjects on a given level. */
      select: { id: true, kind: true, level: true, ugLevel: true },
      orderBy: { id: "asc" },
    }),
    unLevelTotals(LADDER_STREAMS.un),
    unLevelTotals(LADDER_STREAMS.ug),
  ]);
  return { subjects, totals: { [LADDER_STREAMS.un]: un, [LADDER_STREAMS.ug]: ug } };
}

export type CohortAccountRow = {
  id: string;
  slug: string | null;
  nickname: string;
  displayName: string | null;
  joinedByEmail: string | null;
  createdAt: Date;
  unLevel: number;
  unLevelFloor: number;
  unPlacedAt: Date | null;
  ugLevel: number;
  ugLevelFloor: number;
  ugPlacedAt: Date | null;
  xp: number;
  xpLevel: number;
  lastActivityAt: Date | null;
};

const ACCOUNT_SELECT = {
  id: true, slug: true, nickname: true, displayName: true, joinedByEmail: true, createdAt: true,
  unLevel: true, unLevelFloor: true, unPlacedAt: true,
  ugLevel: true, ugLevelFloor: true, ugPlacedAt: true,
  xp: true, xpLevel: true, lastActivityAt: true,
} as const;

/** Every simulated account, oldest first. */
export async function loadCohortAccounts(): Promise<CohortAccountRow[]> {
  return prisma.account.findMany({
    where: { userType: USER_TYPES.test },
    select: ACCOUNT_SELECT,
    orderBy: { createdAt: "asc" },
  });
}

/** Every slug in use, so an invented one cannot collide. */
export async function takenSlugs(): Promise<Set<string>> {
  const rows = await prisma.account.findMany({ select: { slug: true } });
  return new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));
}

/** Creates the rows a sign-up would, dated when the member joined. */
export async function createCohortAccounts(members: readonly NewCohortMember[]): Promise<CohortAccountRow[]> {
  const created: CohortAccountRow[] = [];
  for (const member of members) {
    const persona = derivePersona({
      slug: member.slug, displayName: member.displayName, country: member.country, joinedAt: member.createdAt,
    });
    created.push(await prisma.account.create({
      data: {
        nickname: member.displayName,
        displayName: member.displayName,
        slug: member.slug,
        joinedByEmail: member.email,
        joinedByName: member.displayName,
        userType: USER_TYPES.test,
        visibility: persona.visibility,
        approvalStatus: ACCOUNT_APPROVAL.approved,
        approvedAt: member.createdAt,
        ageBand: persona.ageBand,
        /* The ladder they walk, which the site records per member. */
        ladderStream: persona.stream,
        createdAt: member.createdAt,
      },
      select: ACCOUNT_SELECT,
    }));
  }
  return created;
}

/** A member as the database holds them, ready to carry on from. */
export async function loadMember(account: CohortAccountRow, world: CohortWorld): Promise<CohortMember | null> {
  const persona = personaFor(account);
  if (!persona) return null;

  const [states, events, bests, clearedGates] = await Promise.all([
    prisma.ukSrsState.findMany({ where: { accountId: account.id } }),
    prisma.xpEvent.findMany({
      where: { accountId: account.id },
      select: { kind: true, dayKey: true, amount: true, note: true, createdAt: true, updatedAt: true },
    }),
    /* What this member has already scored at each game, so a second run of
       the simulation does not hand them a personal best for a score they had
       already beaten. One grouped query rather than a lookup per game. */
    prisma.gameRun.groupBy({
      by: ["kind"],
      where: { accountId: account.id, status: "completed" },
      _max: { score: true },
    }),
    prisma.levelTest.findMany({
      where: { accountId: account.id, mustPass: true, verdict: { in: ["solid", "passed"] } },
      select: { gateKey: true },
      distinct: ["gateKey"],
    }),
  ]);

  const onUg = persona.stream === LADDER_STREAMS.ug;
  const member: CohortMember = {
    persona,
    states: new Map(
      states.map((row) => [row.subjectId, {
        id: row.id,
        subjectId: row.subjectId,
        srsStage: row.srsStage,
        availableAt: row.availableAt,
        unlockedAt: row.unlockedAt ?? row.createdAt,
        startedAt: row.startedAt ?? row.createdAt,
        passedAt: row.passedAt,
        burnedAt: row.burnedAt,
        lastReviewedAt: row.lastReviewedAt,
        reviewCount: row.reviewCount,
        correctCount: row.correctCount,
        wrongCount: row.wrongCount,
        origin: row.origin === "placement" ? "placement" : "lesson",
        dirty: false,
      } satisfies CohortStateRow]),
    ),
    attempts: [],
    tests: [],
    /* Finals they have already cleared, so a re-run does not sit them again
       and the walk still gets past the gates they earned. */
    passedGates: new Set(clearedGates.map((row) => row.gateKey)),
    /* On the ladder this member follows. Seeding all three from the UN
       columns put a UG member's UN level into `member.level`, which the
       `Math.max` below then kept whenever it was the higher of the two - so
       a UG member could be simulated as standing above where their own
       ladder puts them. */
    floor: onUg ? account.ugLevelFloor : account.unLevelFloor,
    level: onUg ? account.ugLevel : account.unLevel,
    placedAt: onUg ? account.ugPlacedAt : account.unPlacedAt,
    ledger: new CohortLedger(events, account.xp),
    bestScores: new Map(
      bests.flatMap((row) => (row._max.score === null ? [] : [[row.kind as string, row._max.score]])),
    ),
    lastActivityAt: account.lastActivityAt,
  };
  member.level = Math.max(member.level, resolvedLevel(member, world));
  return member;
}

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
async function updateStates(rows: readonly CohortStateRow[]): Promise<void> {
  for (let at = 0; at < rows.length; at += CHUNK) {
    const chunk = rows.slice(at, at + CHUNK);
    await prisma.$executeRaw`
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

/** Writes the study half: state rows and the answers that produced them. */
export async function saveStudy(accountId: string, member: CohortMember): Promise<{ states: number; attempts: number }> {
  const fresh = [...member.states.values()].filter((state) => state.id === null);
  const moved = [...member.states.values()].filter((state) => state.id !== null && state.dirty);

  for (let at = 0; at < fresh.length; at += CHUNK) {
    await prisma.ukSrsState.createMany({
      data: fresh.slice(at, at + CHUNK).map((state) => stateCreate(accountId, state)),
      skipDuplicates: true,
    });
  }
  await updateStates(moved);

  if (fresh.length > 0) {
    const ids = await prisma.ukSrsState.findMany({ where: { accountId }, select: { id: true, subjectId: true } });
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
    await prisma.ukReviewAttempt.createMany({ data: attempts.slice(at, at + CHUNK) });
  }

  /* The finals they sat. `skipDuplicates` because a re-run replays no day
     twice but a member's cleared gates are loaded back, so the same attempt
     number must not be written again. */
  if (member.tests.length > 0) {
    await prisma.levelTest.createMany({
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

export type PlayedGame = { kind: string; score: number; correct: number; answered: number };

/**
 * One round: planned by the site, played by the persona, scored by the site.
 *
 * Written in one statement with its answers already in, dated when it was
 * played. A pool that cannot fill a round - a category with nothing in it at
 * that level, a Daily Challenge already taken - is a round not played, which
 * is what it would have been for a person too.
 */
export async function playGame({
  accountId,
  member,
  request,
  at,
}: {
  accountId: string;
  member: CohortMember;
  request: GameRunRequest;
  at: Date;
}): Promise<PlayedGame | null> {
  const persona: CohortPersona = member.persona;
  let plan;
  try {
    plan = await planGameRun(accountId, request);
  } catch {
    return null;
  }
  if (plan.questions.length === 0) return null;

  const played = playRun({
    persona,
    questions: plan.questions,
    choiceCount: plan.choiceCount,
    timeLimitMs: plan.timeLimitMs,
    startedAt: at,
    random: sessionRandom(persona, at),
  });
  if (played.answeredCount === 0) return null;

  const values = completedRunValues({
    kind: request.kind,
    startedAt: at,
    correctCount: played.correctCount,
    questionCount: plan.questionCount,
    bestStreak: played.bestStreak,
    level: plan.level,
    timeLimitMs: plan.timeLimitMs,
    accumulatedScore: played.accumulatedScore,
    now: played.completedAt,
  });
  const answerAt = new Map(played.answers.map((answer) => [answer.position, answer]));

  /* What the day's allowance lets this game pay, decided before the row is
     written so the run can say so, the way the answer route records it.

     The run's own facts go in, not just the fact that it ended: a simulated
     member has to earn what a real one would, or the cohort reads low against
     real play on exactly the boards it exists to populate. `previousBest` is
     undefined until this member has finished this kind once - null, not zero,
     because a first run has nothing to beat.

     `clearedMap` stays null. It needs the run's target ids checked against a
     country's whole region set, and it is only reachable on Japan and Canada;
     a simulated member missing it costs the boards less than a wrong claim. */
  const previousBest = member.bestScores.get(request.kind);
  const xpAwarded = member.ledger.awardAll(
    gameXpAwards({
      label: GAME_KIND_LABELS[request.kind],
      questionCount: plan.questionCount,
      correctCount: played.correctCount,
      score: values.score ?? played.accumulatedScore,
      previousBest: previousBest ?? null,
      clearedMap: null,
    }),
    values.completedAt,
  );
  member.bestScores.set(request.kind, Math.max(previousBest ?? 0, values.score ?? played.accumulatedScore));

  try {
    await prisma.gameRun.create({
      data: {
        accountId,
        kind: request.kind as PrismaGameKind,
        xpAwarded,
        batchSize: plan.batchSize,
        level: plan.level,
        category: plan.category as GameSubjectCategory,
        choiceCount: plan.choiceCount,
        direction: plan.direction,
        answerMode: plan.answerMode,
        hardMode: plan.choiceCount >= 3,
        dailyKey: plan.dailyKey,
        seed: plan.seed,
        timeLimitMs: plan.timeLimitMs,
        questionCount: plan.questionCount,
        answeredCount: played.answeredCount,
        correctCount: played.correctCount,
        ...values,
        startedAt: at,
        createdAt: at,
        updatedAt: values.completedAt,
        questions: {
          create: plan.questions.map((question) => {
            const answer = answerAt.get(question.position);
            return {
              ...question,
              selectedSubjectId: answer?.selectedSubjectId ?? null,
              correct: answer?.correct ?? null,
              answeredAt: answer?.answeredAt ?? null,
            };
          }),
        },
      },
      select: { id: true },
    });
  } catch (error) {
    /* The Daily Challenge's one-a-day key, most likely. Not a game, then. */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }

  /* Mirrors the answer route's finish: the game's XP above, then the day's. */
  member.ledger.settleDay(values.completedAt, dueStates(member, values.completedAt).length);
  if (!member.lastActivityAt || values.completedAt > member.lastActivityAt) member.lastActivityAt = values.completedAt;

  return { kind: request.kind, score: values.score, correct: played.correctCount, answered: played.answeredCount };
}

/** Whether this member has already taken today's Daily Challenge. */
export async function dailyTaken(accountId: string, now: Date): Promise<boolean> {
  const run = await prisma.gameRun.findFirst({
    where: { accountId, kind: "daily", dailyKey: getVancouverDateKey(now) },
    select: { id: true },
  });
  return run !== null;
}

/** Removes every simulated account and, through the cascades, everything they did. */
export async function removeCohort(): Promise<number> {
  const removed = await prisma.account.deleteMany({ where: { userType: USER_TYPES.test } });
  return removed.count;
}
