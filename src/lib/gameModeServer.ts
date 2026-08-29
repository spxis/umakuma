import "server-only";

import { GameAnswerType, GameKind, GameRunStatus, GameSubjectCategory } from "@prisma/client";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { isSubjectType, type SubjectType } from "@/lib/domainConstants";
import {
  GAME_KINDS,
  GAME_DIRECTIONS,
  gameChoiceCountFrom,
  gamePoolItemMatches,
  isUltraGameBatchSize,
  resolveGameScore,
  type GameCategory,
  type GameKind as GameKindValue,
  type GameDirection,
  type GameOption,
  type GameOptionTile,
  type GameQuestionPayload,
  type GameRunSummary,
} from "@/lib/gameMode";
import { optionLabel, promptText } from "@/lib/gameAnswerText";
import { parseMeanings, parseReadings, type GameCatalogItem } from "@/lib/gameQuestionBuilder";
import { prisma } from "@/lib/prisma";
import { parseAssignmentCacheRows } from "@/lib/wanikani/helpers";

export {
  buildGameQuestions,
  buildGameQuestionsFromTargets,
  buildShiritoriQuestion,
  shiritoriChainKeyAfter,
  shiritoriOpeningKeys,
  shiritoriPlayableTargets,
} from "@/lib/gameQuestionBuilder";
export type { GameCatalogItem, GameQuestionInput } from "@/lib/gameQuestionBuilder";

export const CATALOG_SELECT = {
  wkSubjectId: true,
  subjectType: true,
  level: true,
  characters: true,
  slug: true,
  meanings: true,
  readings: true,
  componentSubjectIds: true,
  visuallySimilarSubjectIds: true,
} as const;

export type CatalogRow = {
  wkSubjectId: number;
  subjectType: string;
  level: number;
  characters: string | null;
  slug: string | null;
  meanings: unknown;
  readings: unknown;
  componentSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
};

/** Shapes a catalog row into a playable item, or drops it when unusable. */
export function toCatalogItem(
  row: CatalogRow,
  assignment: { assignmentId: number; srsStage: number; startedAt: string },
): GameCatalogItem | null {
  if (!isSubjectType(row.subjectType)) return null;
  const meanings = parseMeanings(row.meanings);
  const readings = parseReadings(row.readings);
  const characters = row.characters?.trim() || row.slug?.trim();
  if (!characters || meanings.length === 0) return null;

  return {
    ...assignment,
    subjectId: row.wkSubjectId,
    subjectType: row.subjectType as SubjectType,
    level: row.level,
    characters,
    primaryMeaning: meanings[0] ?? null,
    primaryReading: readings[0] ?? null,
    readings,
    componentSubjectIds: row.componentSubjectIds,
    visuallySimilarSubjectIds: row.visuallySimilarSubjectIds,
  };
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
    select: CATALOG_SELECT,
  });
  const catalogById = new Map(catalogRows.map((row) => [row.wkSubjectId, row]));

  const items = assignments.flatMap((assignment) => {
    const row = catalogById.get(assignment.subjectId);
    if (!row || !isSubjectType(row.subjectType)) return [];
    const poolItem = {
      ...assignment,
      subjectType: row.subjectType as SubjectType,
      level: row.level,
    };
    if (!gamePoolItemMatches(poolItem, level, category)) return [];
    const item = toCatalogItem(row, {
      assignmentId: assignment.assignmentId,
      srsStage: assignment.srsStage,
      startedAt: assignment.startedAt!,
    });
    return item ? [item] : [];
  });

  return { account: { nickname: account.nickname, wkUsername: account.wkUsername, wkLevel: account.wkLevel }, items };
}

export function toGameRunSummary(run: {
  id: string;
  accountId: string;
  kind: GameKind;
  batchSize: number;
  level: number | null;
  category: GameSubjectCategory;
  hardMode: boolean;
  choiceCount: number;
  direction: string;
  timeLimitMs: number | null;
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
  // Built field by field on purpose: callers pass runs with `questions`
  // included, and spreading would ship every targetSubjectId to the client.
  return {
    id: run.id,
    accountId: run.accountId,
    kind: run.kind as GameKindValue,
    batchSize: run.batchSize,
    timeLimitMs: run.timeLimitMs,
    level: run.level,
    category: run.category as GameCategory,
    hardMode: run.hardMode,
    direction: run.direction as GameDirection,
    choiceCount: gameChoiceCountFrom(run.choiceCount, run.hardMode),
    ultraMode: isUltraGameBatchSize(run.batchSize),
    questionCount: run.questionCount,
    answeredCount: run.answeredCount,
    correctCount: run.correctCount,
    currentStreak: run.currentStreak,
    bestStreak: run.bestStreak,
    score: run.score,
    durationMs: run.durationMs,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

export async function hydrateGameQuestions(
  questions: Array<{
    id: string;
    position: number;
    targetSubjectId: number;
    leftSubjectId: number;
    middleSubjectId: number | null;
    rightSubjectId: number;
    optionSubjectIds?: number[];
    answerType: GameAnswerType;
    promptOverride: string | null;
  }>,
  direction: GameDirection = GAME_DIRECTIONS.find,
): Promise<GameQuestionPayload[]> {
  // Questions created before Quad mode have no option list; fall back to the
  // original left/middle/right columns for those.
  const optionIdsFor = (row: { optionSubjectIds?: number[]; leftSubjectId: number; middleSubjectId: number | null; rightSubjectId: number }) =>
    row.optionSubjectIds && row.optionSubjectIds.length > 0
      ? row.optionSubjectIds
      : [row.leftSubjectId, row.middleSubjectId, row.rightSubjectId].filter((id): id is number => id !== null);
  const subjectIds = Array.from(new Set(questions.flatMap(optionIdsFor)));
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
    const options = optionIdsFor(question).map((id) => optionById.get(id));
    if (!target || options.some((option) => !option)) throw new Error("Game question subjects are unavailable.");
    const prompt = question.promptOverride ?? promptText(target, direction, question.answerType);
    if (!prompt) throw new Error("Game question prompt is unavailable.");
    return {
      id: question.id,
      position: question.position,
      answerType: question.answerType,
      prompt,
      options: (options as GameOption[]).map((option) => ({
        ...option,
        label: optionLabel(option, direction, question.answerType),
      })) satisfies GameOptionTile[],
    };
  });
}

export function completedRunValues({
  kind,
  startedAt,
  correctCount,
  questionCount,
  bestStreak,
  level,
  timeLimitMs,
  accumulatedScore,
}: {
  kind: GameKindValue;
  startedAt: Date;
  correctCount: number;
  questionCount: number;
  bestStreak: number;
  level: number | null;
  timeLimitMs: number | null;
  accumulatedScore?: number;
}) {
  const completedAt = new Date();
  const elapsedMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
  // Time Attack always ran the full clock, so record the limit rather than the
  // moment the last answer happened to land.
  const durationMs = kind === GAME_KINDS.timeAttack && timeLimitMs !== null ? timeLimitMs : elapsedMs;
  return {
    status: GameRunStatus.completed,
    completedAt,
    completedDatePst: getVancouverDateKey(completedAt),
    durationMs,
    score: resolveGameScore({ kind, correctCount, questionCount, durationMs, level, accumulatedScore }),
    currentStreak: 0,
    bestStreak,
  };
}
