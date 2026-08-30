import "server-only";

import { GameKind as PrismaGameKind, GameSubjectCategory } from "@prisma/client";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import {
  GAME_DIRECTIONS,
  GAME_ENDLESS_CYCLE_SIZE,
  GAME_KINDS,
  GAME_PRACTICE_LISTS,
  GAME_ULTRA_BATCH_SIZE,
  gameKindRules,
  type GameCategory,
  type GameAnswerMode,
  type GameChoiceCount,
  type GameDirection,
  type GameKind,
  type GamePracticeList,
} from "@/lib/gameMode";
import { buildMapQuestions } from "@/lib/gameMapQuestions";
import { loadDailyPool, loadPracticePool, loadShiritoriPool } from "@/lib/gameModePools";
import { loadGamePool } from "@/lib/gameModeServer";
import { seededRandom, shuffleWith } from "@/lib/gameRandom";
import {
  buildGameQuestions,
  buildGameQuestionsFromTargets,
  buildShiritoriQuestion,
  shiritoriOpeningKeys,
  shiritoriPlayableTargets,
  type GameQuestionInput,
} from "@/lib/gameQuestionBuilder";
import { JAPAN_PREFECTURE_COUNT } from "@/lib/japanPrefectures";
import { prisma } from "@/lib/prisma";

export const DAILY_ALREADY_PLAYED = "You already played today's Daily Challenge.";

export class GameRunConflictError extends Error {}

export type GameRunRequest = {
  kind: GameKind;
  batchSize: "all" | number;
  level: number | null;
  category: GameCategory;
  choiceCount: GameChoiceCount;
  direction: GameDirection;
  answerMode: GameAnswerMode;
  practiceList: GamePracticeList;
  ultraMode: boolean;
  timeLimitMs: number | null;
};

export type GameRunPlan = {
  questions: GameQuestionInput[];
  questionCount: number;
  batchSize: number;
  level: number | null;
  category: GameCategory;
  choiceCount: GameChoiceCount;
  direction: GameDirection;
  answerMode: GameAnswerMode;
  dailyKey: string | null;
  seed: string | null;
  timeLimitMs: number | null;
};

function resolveBatchSize(request: GameRunRequest, poolSize: number): number {
  const rules = gameKindRules(request.kind);
  if (rules.fixedQuestionCount !== null) return Math.min(rules.fixedQuestionCount, poolSize);
  if (request.ultraMode || request.batchSize === "all") return poolSize;
  return request.batchSize;
}

async function planMatchRun(accountId: string, request: GameRunRequest): Promise<GameRunPlan> {
  const { items } = await loadGamePool(accountId, request.level, request.category);
  const questionCount = resolveBatchSize(request, items.length);
  return {
    questions: buildGameQuestions(items, questionCount, request.choiceCount, Math.random, request.direction, request.answerMode),
    questionCount,
    batchSize: request.ultraMode ? GAME_ULTRA_BATCH_SIZE : questionCount,
    level: request.level,
    category: request.category,
    choiceCount: request.choiceCount,
    direction: request.direction,
    answerMode: request.answerMode,
    dailyKey: null,
    seed: null,
    timeLimitMs: null,
  };
}

const PRACTICE_LIST_EMPTY: Record<GamePracticeList, string> = {
  [GAME_PRACTICE_LISTS.trouble]: "No trouble-tagged items are available for this category.",
  [GAME_PRACTICE_LISTS.favorite]: "No favorite-tagged items are available for this category.",
  [GAME_PRACTICE_LISTS.toughest]: "No eligible items are available.",
};

async function planPracticeRun(accountId: string, request: GameRunRequest): Promise<GameRunPlan> {
  const requestedSize = request.batchSize === "all" ? Number.MAX_SAFE_INTEGER : request.batchSize;
  const { items, targets } = await loadPracticePool(
    accountId,
    request.category,
    request.batchSize === "all" ? GAME_ENDLESS_CYCLE_SIZE : request.batchSize,
    request.practiceList,
  );
  const minimumItems = request.choiceCount;
  if (items.length < minimumItems) {
    throw new Error(`At least ${minimumItems} eligible items are required.`);
  }
  const chosen = shuffleWith(targets).slice(0, Math.min(requestedSize, targets.length));
  if (chosen.length === 0) throw new Error(PRACTICE_LIST_EMPTY[request.practiceList]);

  return {
    questions: buildGameQuestionsFromTargets(chosen, items, request.choiceCount, Math.random, request.direction, request.answerMode),
    questionCount: chosen.length,
    batchSize: chosen.length,
    level: null,
    category: request.category,
    choiceCount: request.choiceCount,
    direction: request.direction,
    answerMode: request.answerMode,
    dailyKey: null,
    seed: null,
    timeLimitMs: null,
  };
}

/**
 * Every account plays the identical set. The first run of the day defines it and
 * later runs copy those questions, so a mid-day level-up cannot shift the pool.
 */
async function planDailyRun(request: GameRunRequest): Promise<GameRunPlan> {
  const dailyKey = getVancouverDateKey(new Date());
  const rules = gameKindRules(request.kind);
  const established = await prisma.gameRun.findFirst({
    where: { kind: PrismaGameKind.daily, dailyKey },
    orderBy: { createdAt: "asc" },
    select: {
      seed: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          targetSubjectId: true,
          leftSubjectId: true,
          middleSubjectId: true,
          rightSubjectId: true,
          optionSubjectIds: true,
          answerType: true,
          promptOverride: true,
        },
      },
    },
  });

  if (established && established.questions.length > 0) {
    return {
      questions: established.questions.map((question) => ({ ...question })),
      questionCount: established.questions.length,
      batchSize: established.questions.length,
      level: null,
      category: rules.fixedCategory ?? request.category,
      choiceCount: 2,
      direction: "find",
      answerMode: "auto",
      dailyKey,
      seed: established.seed,
      timeLimitMs: null,
    };
  }

  const { items } = await loadDailyPool();
  const questionCount = Math.min(rules.fixedQuestionCount ?? items.length, items.length);
  return {
    questions: buildGameQuestions(items, questionCount, 2, seededRandom(dailyKey), "find", "auto"),
    questionCount,
    batchSize: questionCount,
    level: null,
    category: rules.fixedCategory ?? request.category,
    choiceCount: 2,
    direction: "find",
    answerMode: "auto",
    dailyKey,
    seed: dailyKey,
    timeLimitMs: null,
  };
}

async function planTimeAttackRun(accountId: string, request: GameRunRequest): Promise<GameRunPlan> {
  const { items } = await loadGamePool(accountId, request.level, request.category);
  const questionCount = Math.min(GAME_ENDLESS_CYCLE_SIZE, items.length);
  return {
    questions: buildGameQuestions(items, questionCount, request.choiceCount, Math.random, request.direction, request.answerMode),
    questionCount,
    batchSize: questionCount,
    level: request.level,
    category: request.category,
    choiceCount: request.choiceCount,
    direction: request.direction,
    answerMode: request.answerMode,
    dailyKey: null,
    seed: null,
    timeLimitMs: request.timeLimitMs,
  };
}

async function planShiritoriRun(accountId: string, request: GameRunRequest): Promise<GameRunPlan> {
  const { items } = await loadShiritoriPool(accountId);
  const minimumItems = request.choiceCount;
  if (items.length < minimumItems) {
    throw new Error(`At least ${minimumItems} eligible items are required.`);
  }

  const openings = shuffleWith(shiritoriOpeningKeys(items));
  for (const chainKey of openings) {
    if (shiritoriPlayableTargets(items, chainKey, new Set()).length === 0) continue;
    const question = buildShiritoriQuestion({
      pool: items,
      chainKey,
      position: 0,
      usedSubjectIds: new Set(),
      previousItem: null,
      choiceCount: request.choiceCount,
    });
    if (!question) continue;
    return {
      questions: [question],
      questionCount: 1,
      batchSize: 1,
      level: null,
      category: "vocabulary",
      choiceCount: request.choiceCount,
      // Shiritori always shows words and asks for the next word.
      direction: GAME_DIRECTIONS.find,
      answerMode: "auto",
      dailyKey: null,
      seed: null,
      timeLimitMs: null,
    };
  }
  throw new Error("No eligible items are available.");
}

/**
 * The 47 prefectures are a fixed, shared pool: no assignments, no levels, and
 * the same board for every player.
 */
function planMapRun(request: GameRunRequest): GameRunPlan {
  const requested = request.batchSize === "all" ? JAPAN_PREFECTURE_COUNT : request.batchSize;
  const questionCount = Math.min(requested, JAPAN_PREFECTURE_COUNT);
  return {
    questions: buildMapQuestions(
      questionCount,
      request.choiceCount,
      Math.random,
      request.direction,
      request.answerMode,
    ),
    questionCount,
    batchSize: questionCount,
    level: null,
    category: request.category,
    choiceCount: request.choiceCount,
    direction: request.direction,
    answerMode: request.answerMode,
    dailyKey: null,
    seed: null,
    timeLimitMs: null,
  };
}

export async function planGameRun(accountId: string, request: GameRunRequest): Promise<GameRunPlan> {
  if (request.kind === GAME_KINDS.daily) return planDailyRun(request);
  if (request.kind === GAME_KINDS.revenge) return planPracticeRun(accountId, request);
  if (request.kind === GAME_KINDS.timeAttack) return planTimeAttackRun(accountId, request);
  if (request.kind === GAME_KINDS.shiritori) return planShiritoriRun(accountId, request);
  if (request.kind === GAME_KINDS.map) return planMapRun(request);
  return planMatchRun(accountId, request);
}

/**
 * Daily Challenge is one attempt per account per day. An unfinished attempt is
 * resumed rather than replaced so a reload cannot burn the day's run.
 */
export async function findResumableDailyRun(accountId: string) {
  const dailyKey = getVancouverDateKey(new Date());
  const existing = await prisma.gameRun.findUnique({
    where: { accountId_kind_dailyKey: { accountId, kind: PrismaGameKind.daily, dailyKey } },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!existing) return null;
  if (existing.status === "completed") throw new GameRunConflictError(DAILY_ALREADY_PLAYED);
  // Starting another game abandons the active run; reclaim today's attempt and
  // make sure it is the only run left active.
  return prisma.$transaction(async (tx) => {
    await tx.gameRun.updateMany({
      where: { accountId, status: "active", id: { not: existing.id } },
      data: { status: "abandoned" },
    });
    if (existing.status === "active") return existing;
    return tx.gameRun.update({
      where: { id: existing.id },
      data: { status: "active" },
      include: { questions: { orderBy: { position: "asc" } } },
    });
  });
}

export async function persistGameRun(accountId: string, request: GameRunRequest, plan: GameRunPlan) {
  return prisma.$transaction(async (tx) => {
    await tx.gameRun.updateMany({
      where: { accountId, status: "active" },
      data: { status: "abandoned" },
    });
    return tx.gameRun.create({
      data: {
        accountId,
        kind: request.kind as PrismaGameKind,
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
        questions: { create: plan.questions },
      },
      include: { questions: { orderBy: { position: "asc" } } },
    });
  });
}
