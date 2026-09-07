import "server-only";

import { GAME_KINDS } from "@/lib/gameMode";
import { buildGameQuestions } from "@/lib/gameQuestionBuilder";
import { GAME_LADDERS, persistGameRun } from "@/lib/gameRunCreate";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { prisma } from "@/lib/prisma";
import { awardXpQuietly } from "@/lib/xp/xpServer";
import { XP_REASONS } from "@/lib/xp/xpStudyAwards";
import type { XpEarned } from "@/lib/xp/xpToast";
import { memberStudyPreferences } from "@/lib/srs/studyPreferencesServer";

import { gateAfterLevel, testVerdict, verdictClears, type UkGate, type UkTestVerdict } from "./ukGates";
import { loadUmakumaGamePool } from "./ukGamePool";
import { deriveLadderLevel, syncAccountLevels } from "./unLevelServer";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

/**
 * Sitting a level test.
 *
 * The questions, the board, the answer route and the scoring are the games'
 * own - a test is a `GameRun` of kind `level_test`, so nothing about answering
 * it is new code. What is new is the row beside the run saying which gate it
 * stands at, whether it must be passed, and what the verdict was.
 *
 * Every test records the curriculum version it was sat on. A pass is a claim
 * about a curriculum, and if the ladder moves, a pass on 1.2 should still say
 * what it was a pass of rather than silently becoming a claim about material
 * the member never saw.
 */

/** Tiles on the board. Four for a final, where guessing must not pay; three for a checkpoint, which is practice. */
const CHOICES = { jlpt_final: 4, checkpoint: 3 } as const;

export type StartedLevelTest = {
  testId: string;
  run: Awaited<ReturnType<typeof persistGameRun>>;
  gate: UkGate;
  attempt: number;
};

/** The gate waiting for this member, if their standing has reached one. */
export async function pendingGate(accountId: string): Promise<UkGate | null> {
  const [standing, preferences] = await Promise.all([deriveLadderLevel(accountId, LADDER_STREAMS.un), memberStudyPreferences(accountId)]);
  /* Held by a final: that gate. Otherwise, a checkpoint at the level just
     cleared if the member asked for one at this interval. */
  const gate = standing.heldByGate
    ? gateAfterLevel(standing.level, preferences)
    : gateAfterLevel(standing.level - 1, preferences);
  if (!gate) return null;
  /* A gate is sat once. The final that lifted a hold is still "the gate after
     level 10" the day after, and a checkpoint counts as written whatever it
     said - so what has been done is asked of the record, not the arithmetic. */
  const sat = await prisma.levelTest.findFirst({
    where: {
      accountId,
      gateKey: gate.gateKey,
      verdict: gate.mustPass ? { in: ["solid", "passed"] } : { not: null },
    },
    select: { id: true },
  });
  return sat ? null : gate;
}

export async function startLevelTest(accountId: string, gate: UkGate): Promise<StartedLevelTest> {
  const pool = (
    await loadUmakumaGamePool({ accountId, level: null, category: "mixed", maxLevel: gate.drawsFrom.lastLevel })
  ).filter((item) => item.level >= gate.drawsFrom.firstLevel);

  const choiceCount = CHOICES[gate.kind];
  const questionCount = Math.min(gate.questionCount, pool.length);
  const questions = buildGameQuestions(pool, questionCount, choiceCount);

  const attempts = await prisma.levelTest.count({ where: { accountId, gateKey: gate.gateKey } });
  const run = await persistGameRun(
    accountId,
    {
      kind: GAME_KINDS.levelTest,
      batchSize: questionCount,
      level: gate.level,
      category: "mixed",
      choiceCount,
      direction: "find",
      answerMode: "auto",
      practiceList: "toughest",
      ultraMode: false,
      timeLimitMs: null,
      ladder: GAME_LADDERS.umakuma,
    },
    {
      questions,
      questionCount,
      batchSize: questionCount,
      level: gate.level,
      category: "mixed",
      choiceCount,
      direction: "find",
      answerMode: "auto",
      dailyKey: null,
      seed: null,
      timeLimitMs: null,
    },
  );

  const test = await prisma.levelTest.create({
    data: {
      accountId,
      kind: gate.kind,
      gateKey: gate.gateKey,
      attempt: attempts + 1,
      level: gate.level,
      questionCount,
      threshold: gate.threshold,
      mustPass: gate.mustPass,
      runId: run.id,
      curriculumVersion: CURRICULUM_VERSION,
    },
  });
  return { testId: test.id, run, gate, attempt: attempts + 1 };
}

export type FinishedLevelTest = {
  verdict: UkTestVerdict;
  cleared: boolean;
  correct: number;
  answered: number;
  /** Where the member stands now, re-derived with this result counted. */
  level: number;
  /** What sitting it paid, so the page can say so. */
  earned: XpEarned;
};

/**
 * Reads the run's result onto the test and re-derives the level.
 *
 * Idempotent: a test already finished returns what it already said. The run
 * is the source of the counts - nothing here trusts a number from a request.
 */
export async function finalizeLevelTest(accountId: string, testId: string): Promise<FinishedLevelTest | null> {
  const test = await prisma.levelTest.findFirst({ where: { id: testId, accountId } });
  if (!test || !test.runId) return null;

  const run = await prisma.gameRun.findUnique({
    where: { id: test.runId },
    select: { correctCount: true, questionCount: true, status: true },
  });
  if (!run) return null;

  const answered = run.questionCount;
  const correct = run.correctCount;
  const verdict = test.verdict ?? testVerdict(correct, answered, test.threshold);
  const cleared = verdictClears(verdict, test.mustPass);
  /* Zero on a replay: the award is paid inside the branch that records the
     verdict, so a second finalize of the same test pays nothing and says so. */
  let testXp = 0;

  if (!test.verdict) {
    await prisma.levelTest.update({
      where: { id: test.id },
      data: { verdict, correctCount: correct, answeredCount: answered, completedAt: new Date() },
    });
    /* Paid here, inside the branch that records the verdict, so a second
       finalize of the same test - a retried request, a replayed hook - pays
       nothing again. Writing pays; passing pays on top. */
    const note = `${test.gateKey} · ${correct}/${answered}`;
    testXp = await awardXpQuietly({
      accountId,
      requests: [
        { kind: "levelTestWritten", note },
        ...(cleared ? [{ kind: "levelTestPassed" as const, note }] : []),
      ],
    });
  }

  /* A cleared final may move the level; a checkpoint never does, but the
     re-derivation is cheap and keeps one writer. */
  const standing = await syncAccountLevels(accountId);
  const earned: XpEarned = testXp > 0 ? [{ xp: testXp, reason: XP_REASONS.levelTest }] : [];
  return { verdict, cleared, correct, answered, level: standing.level, earned };
}

/** The answer route finishes a run knowing only the run; the test is found from it. */
export async function finalizeLevelTestForRun(accountId: string, runId: string): Promise<FinishedLevelTest | null> {
  const test = await prisma.levelTest.findFirst({ where: { accountId, runId }, select: { id: true } });
  return test ? finalizeLevelTest(accountId, test.id) : null;
}
