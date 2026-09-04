import "server-only";

/* Every country in memory. The browser loads one at a time; the server, which
   ships no bundle, wants the lot - see geoRegionServer. */
import "./geoRegionServer";

import { GameAnswerType, GameKind, GameRunStatus, GameSubjectCategory } from "@prisma/client";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { isSubjectType, type SubjectType } from "@/lib/domainConstants";
import {
  GAME_KINDS,
  GAME_DIRECTIONS,
  gameChoiceCountFrom,
  gamePoolItemMatches,
  isUltraGameBatchSize,
  type GameCategory,
  type GameKind as GameKindValue,
  type GameDirection,
  type GameOption,
  type GameOptionTile,
  type GameQuestionPayload,
  type GameRunSummary,
} from "@/lib/gameMode";
import { unconnectedPoolLevelCap } from "@/lib/unconnectedGamePool";
import { resolveGameScore } from "@/lib/gameScoring";
import { optionLabel, promptText } from "@/lib/gameAnswerText";
import { parseMeanings, parseReadings, type GameCatalogItem } from "@/lib/gameQuestionBuilder";
import { geoMapEntries, geoMapOption } from "@/lib/geoMapPool";
import { geoRegionIdFromSubjectId, isGeoSubjectId } from "@/lib/geoSubjectIds";
import { prisma } from "@/lib/prisma";
import { isUkGameSubjectId } from "@/lib/ladder/ukSubjectIds";
import { ukGameOptions } from "@/lib/uk/ukGamePool";
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


/** A stage for catalogue items nobody has an assignment for. */
const UNCONNECTED_SYNTHETIC_ASSIGNMENT = {
  assignmentId: 0,
  srsStage: 1,
  startedAt: "1970-01-01T00:00:00.000Z",
} as const;

/**
 * The pool for an account with no WaniKani connection.
 *
 * Same shape as a connected pool so nothing downstream can tell the difference:
 * the runner, the scoring and the scoreboard all take `GameCatalogItem`.
 */
export async function loadUnconnectedPool(
  level: number | null,
  category: GameCategory,
  wkLevel: number | null,
): Promise<GameCatalogItem[]> {
  const cap = unconnectedPoolLevelCap(level, wkLevel);

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: {
      ...(level === null ? { level: { lte: cap } } : { level }),
      hiddenAt: null,
      characters: { not: null },
    },
    select: CATALOG_SELECT,
    orderBy: { wkSubjectId: "asc" },
  });

  return rows.flatMap((row) => {
    if (!isSubjectType(row.subjectType)) return [];
    const poolItem = {
      ...UNCONNECTED_SYNTHETIC_ASSIGNMENT,
      subjectId: row.wkSubjectId,
      subjectType: row.subjectType as SubjectType,
      level: row.level,
    };
    if (!gamePoolItemMatches(poolItem, level, category)) return [];
    const item = toCatalogItem(row, UNCONNECTED_SYNTHETIC_ASSIGNMENT);
    return item ? [item] : [];
  });
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

  /*
   * An account with no WaniKani has no assignments, and the games drew only
   * from assignments - so Match and Shiritori answered "Only 0 eligible items
   * are available" for anybody who had not connected. The subjects themselves
   * are not personal: they are the shared catalogue, and Daily Challenge has
   * always played straight off it.
   *
   * So the assignments are treated as what they are, a filter rather than the
   * source. A connected player still plays their own ladder, capped at their
   * level, with their real SRS stages. A player without one gets the catalogue
   * up to `UNCONNECTED_GAME_LEVEL_CAP` and a synthetic stage, the same way the
   * daily pool does.
   */
  if (assignments.length === 0) {
    return {
      account: { nickname: account.nickname, wkUsername: account.wkUsername ?? "", wkLevel: account.wkLevel ?? 0 },
      items: await loadUnconnectedPool(level, category, account.wkLevel),
    };
  }

  const catalogRows = await prisma.wkSubjectCatalog.findMany({
    where: {
      wkSubjectId: { in: assignments.map((item) => item.subjectId) },
      level: { lte: account.wkLevel ?? 0 },
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

  return {
    account: { nickname: account.nickname, wkUsername: account.wkUsername ?? "", wkLevel: account.wkLevel ?? 0 },
    items,
  };
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
  // Three sources, told apart by the id alone. Map mode's prefectures and the
  // UmaKuma curriculum both live in reserved ranges above WaniKani's, so a run
  // does not have to record which ladder it came from - the questions say.
  const ukOptions = await ukGameOptions(subjectIds.filter((id) => isUkGameSubjectId(id)));
  const rows = await prisma.wkSubjectCatalog.findMany({
    where: {
      wkSubjectId: { in: subjectIds.filter((id) => !isGeoSubjectId(id) && !isUkGameSubjectId(id)) },
    },
    select: { wkSubjectId: true, subjectType: true, level: true, characters: true, slug: true, meanings: true, readings: true },
  });
  const optionById = new Map(subjectIds.flatMap((id) => {
    /*
     * A place id carries its country in its range, so a run recorded before
     * the other countries existed still resolves as Japan without anything
     * being migrated.
     */
    const regionId = geoRegionIdFromSubjectId(id);
    if (!regionId) return [];
    const [country, ...codeParts] = regionId.split("-");
    const code = codeParts.join("-");
    const entry = geoMapEntries(country as "JP" | "US" | "CA").find(
      (candidate) => String(candidate.code) === code,
    );
    return entry ? [[id, geoMapOption(entry)] as const] : [];
  }));
  for (const [id, option] of ukOptions) optionById.set(id, option);
  for (const [id, option] of rows.flatMap((row) => {
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
  })) {
    optionById.set(id, option);
  }

  return questions.map((question) => {
    const target = optionById.get(question.targetSubjectId);
    const options = optionIdsFor(question).map((id) => optionById.get(id));
    if (!target || options.some((option) => !option)) throw new Error("Game question subjects are unavailable.");
    const prompt = question.promptOverride ?? promptText(target, direction, question.answerType);
    if (!prompt) throw new Error("Game question prompt is unavailable.");
    // Read draws the target itself as the prompt; Find puts it among the tiles,
    // where naming it would give the answer away.
    const promptIsShape = direction === GAME_DIRECTIONS.read && isGeoSubjectId(target.subjectId);
    return {
      id: question.id,
      position: question.position,
      answerType: question.answerType,
      prompt,
      promptSubjectId: promptIsShape ? target.subjectId : null,
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
