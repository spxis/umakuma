import "server-only";

import { GameAnswerType, GameRunStatus, GameSubjectCategory } from "@prisma/client";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { SUBJECT_TYPES, isSubjectType, type SubjectType } from "@/lib/domainConstants";
import {
  calculateGameScore,
  gamePoolItemMatches,
  type GameBatchSize,
  type GameCategory,
  type GameOption,
  type GameQuestionPayload,
  type GameRunSummary,
} from "@/lib/gameMode";
import { prisma } from "@/lib/prisma";
import { parseAssignmentCacheRows } from "@/lib/wanikani/helpers";

export type GameCatalogItem = GameOption & {
  assignmentId: number;
  srsStage: number;
  startedAt: string;
  readings: string[];
  componentSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
};

function parseMeanings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const primary = rows.filter((row) => row.primary === true);
  const secondary = rows.filter((row) => row.primary !== true);
  return [...primary, ...secondary]
    .map((row) => row.meaning)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

function parseReadings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const accepted = rows.filter((row) => row.accepted_answer !== false && typeof row.reading === "string");
  const primary = accepted.filter((row) => row.primary === true);
  const secondary = accepted.filter((row) => row.primary !== true);
  return [...primary, ...secondary]
    .map((row) => row.reading)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex]!, output[index]!];
  }
  return output;
}

function hasOverlap(left: number[], right: number[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function distractorScore(target: GameCatalogItem, candidate: GameCatalogItem): number {
  let score = 0;
  if (target.readings.some((reading) => candidate.readings.includes(reading))) score += 100;
  if (target.visuallySimilarSubjectIds.includes(candidate.subjectId)) score += 70;
  if (candidate.visuallySimilarSubjectIds.includes(target.subjectId)) score += 60;
  if (hasOverlap(target.componentSubjectIds, candidate.componentSubjectIds)) score += 40;
  if (target.subjectType === candidate.subjectType) score += 20;
  score += Math.max(0, 10 - Math.abs(target.level - candidate.level));
  return score;
}

function chooseDistractor(target: GameCatalogItem, pool: GameCatalogItem[]): GameCatalogItem | null {
  const ranked = pool
    .filter((candidate) => candidate.subjectId !== target.subjectId && candidate.characters !== target.characters)
    .map((candidate) => ({ candidate, score: distractorScore(target, candidate) }))
    .sort((left, right) => right.score - left.score);
  if (ranked.length === 0) return null;
  const topScore = ranked[0]!.score;
  const topPool = ranked.filter((entry) => entry.score === topScore).slice(0, 12);
  return topPool[Math.floor(Math.random() * topPool.length)]?.candidate ?? ranked[0]!.candidate;
}

export async function loadGamePool(
  accountId: string,
  level: number | null,
  category: GameCategory,
): Promise<{ account: { nickname: string; wkUsername: string; wkLevel: number }; items: GameCatalogItem[] }> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { nickname: true, wkUsername: true, wkLevel: true, assignmentCache: true },
  });
  if (!account) throw new Error("Account not found.");

  const assignments = parseAssignmentCacheRows(account.assignmentCache).flatMap((row) => {
    const subjectId = row.data.subject_id;
    const subjectType = row.data.subject_type;
    const srsStage = row.data.srs_stage;
    const startedAt = row.data.started_at;
    if (
      typeof subjectId !== "number" ||
      typeof subjectType !== "string" ||
      !isSubjectType(subjectType) ||
      typeof srsStage !== "number"
    ) {
      return [];
    }
    return [{
      assignmentId: row.id,
      subjectId,
      subjectType,
      srsStage,
      startedAt: typeof startedAt === "string" ? startedAt : null,
    }];
  });

  const catalogRows = await prisma.wkSubjectCatalog.findMany({
    where: {
      wkSubjectId: { in: assignments.map((item) => item.subjectId) },
      level: { lte: account.wkLevel },
      hiddenAt: null,
      characters: { not: null },
    },
    select: {
      wkSubjectId: true,
      subjectType: true,
      level: true,
      characters: true,
      slug: true,
      meanings: true,
      readings: true,
      componentSubjectIds: true,
      visuallySimilarSubjectIds: true,
    },
  });
  const catalogById = new Map(catalogRows.map((row) => [row.wkSubjectId, row]));

  const items = assignments.flatMap((assignment) => {
    const row = catalogById.get(assignment.subjectId);
    if (!row || !isSubjectType(row.subjectType)) return [];
    const meanings = parseMeanings(row.meanings);
    const readings = parseReadings(row.readings);
    const characters = row.characters?.trim() || row.slug?.trim();
    const poolItem = {
      ...assignment,
      subjectType: row.subjectType as SubjectType,
      level: row.level,
    };
    if (!characters || meanings.length === 0 || !gamePoolItemMatches(poolItem, level, category)) return [];

    return [{
      ...poolItem,
      startedAt: assignment.startedAt!,
      characters,
      primaryMeaning: meanings[0] ?? null,
      primaryReading: readings[0] ?? null,
      readings,
      componentSubjectIds: row.componentSubjectIds,
      visuallySimilarSubjectIds: row.visuallySimilarSubjectIds,
    }];
  });

  return { account: { nickname: account.nickname, wkUsername: account.wkUsername, wkLevel: account.wkLevel }, items };
}

export function buildGameQuestions(pool: GameCatalogItem[], batchSize: GameBatchSize) {
  const targets = shuffle(pool).slice(0, batchSize);
  if (targets.length < batchSize) throw new Error(`Only ${targets.length} eligible items are available.`);

  return targets.map((target, position) => {
    const distractor = chooseDistractor(target, pool);
    if (!distractor) throw new Error("Not enough distinct items are available.");
    const canAskReading =
      target.subjectType !== SUBJECT_TYPES.radical &&
      Boolean(target.primaryReading) &&
      Boolean(distractor.primaryReading) &&
      target.primaryReading !== distractor.primaryReading;
    const answerType = canAskReading && Math.random() < 0.5 ? GameAnswerType.reading : GameAnswerType.meaning;
    const targetOnLeft = Math.random() < 0.5;
    return {
      position,
      targetSubjectId: target.subjectId,
      leftSubjectId: targetOnLeft ? target.subjectId : distractor.subjectId,
      rightSubjectId: targetOnLeft ? distractor.subjectId : target.subjectId,
      answerType,
    };
  });
}

export function toGameRunSummary(run: {
  id: string;
  accountId: string;
  batchSize: number;
  level: number | null;
  category: GameSubjectCategory;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  score: number;
  durationMs: number | null;
  status: GameRunStatus;
  startedAt: Date;
  completedAt: Date | null;
}): GameRunSummary {
  return {
    ...run,
    batchSize: run.batchSize as GameBatchSize,
    category: run.category as GameCategory,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

export async function hydrateGameQuestions(
  questions: Array<{ id: string; position: number; targetSubjectId: number; leftSubjectId: number; rightSubjectId: number; answerType: GameAnswerType }>,
): Promise<GameQuestionPayload[]> {
  const subjectIds = Array.from(new Set(questions.flatMap((row) => [row.targetSubjectId, row.leftSubjectId, row.rightSubjectId])));
  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { wkSubjectId: { in: subjectIds } },
    select: { wkSubjectId: true, subjectType: true, level: true, characters: true, slug: true, meanings: true, readings: true },
  });
  const optionById = new Map(rows.flatMap((row) => {
    if (!isSubjectType(row.subjectType)) return [];
    const meanings = parseMeanings(row.meanings);
    const readings = parseReadings(row.readings);
    return [[row.wkSubjectId, {
      subjectId: row.wkSubjectId,
      subjectType: row.subjectType,
      level: row.level,
      characters: row.characters?.trim() || row.slug?.trim() || String(row.wkSubjectId),
      primaryMeaning: meanings[0] ?? null,
      primaryReading: readings[0] ?? null,
    } satisfies GameOption] as const];
  }));

  return questions.map((question) => {
    const target = optionById.get(question.targetSubjectId);
    const left = optionById.get(question.leftSubjectId);
    const right = optionById.get(question.rightSubjectId);
    if (!target || !left || !right) throw new Error("Game question subjects are unavailable.");
    const prompt = question.answerType === GameAnswerType.reading ? target.primaryReading : target.primaryMeaning;
    if (!prompt) throw new Error("Game question prompt is unavailable.");
    return {
      id: question.id,
      position: question.position,
      answerType: question.answerType,
      prompt,
      options: [left, right],
    };
  });
}

export function completedRunValues(startedAt: Date, correctCount: number, questionCount: number, bestStreak: number) {
  const completedAt = new Date();
  const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
  return {
    status: GameRunStatus.completed,
    completedAt,
    completedDatePst: getVancouverDateKey(completedAt),
    durationMs,
    score: calculateGameScore(correctCount, questionCount, durationMs),
    currentStreak: 0,
    bestStreak,
  };
}
