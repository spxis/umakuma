import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { GameAnswerType, GameOption } from "@/lib/gameMode";
import { pickWith, shuffleWith, type RandomSource } from "@/lib/gameRandom";
import {
  shiritoriDistractorScore,
  shiritoriHeadKey,
  shiritoriReadingIsPlayable,
  shiritoriTailKey,
} from "@/lib/gameShiritori";

export type GameCatalogItem = GameOption & {
  assignmentId: number;
  srsStage: number;
  startedAt: string;
  readings: string[];
  componentSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
};

export type GameQuestionInput = {
  position: number;
  targetSubjectId: number;
  leftSubjectId: number;
  middleSubjectId: number | null;
  rightSubjectId: number;
  answerType: GameAnswerType;
  promptOverride: string | null;
};

const ANSWER_TYPES: Record<"reading" | "meaning" | "chain", GameAnswerType> = {
  reading: "reading",
  meaning: "meaning",
  chain: "chain",
};

const SHIRITORI_DISTRACTOR_SAMPLE = 12;
const DISTRACTOR_TOP_SAMPLE = 12;

export function parseMeanings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const primary = rows.filter((row) => row.primary === true);
  const secondary = rows.filter((row) => row.primary !== true);
  return [...primary, ...secondary]
    .map((row) => row.meaning)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

export function parseReadings(raw: unknown): string[] {
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

function chooseDistractor(
  target: GameCatalogItem,
  pool: GameCatalogItem[],
  random: RandomSource,
): GameCatalogItem | null {
  const ranked = pool
    .filter((candidate) => candidate.subjectId !== target.subjectId && candidate.characters !== target.characters)
    .map((candidate) => ({ candidate, score: distractorScore(target, candidate) }))
    .sort((left, right) => right.score - left.score);
  if (ranked.length === 0) return null;
  const topScore = ranked[0]!.score;
  const topPool = ranked.filter((entry) => entry.score === topScore).slice(0, DISTRACTOR_TOP_SAMPLE);
  return pickWith(topPool, random)?.candidate ?? ranked[0]!.candidate;
}

/** Places the target at `slot` among the distractors and returns the option ids. */
function toOptionIds(
  target: GameCatalogItem,
  distractors: GameCatalogItem[],
  slot: number,
  hardMode: boolean,
): Pick<GameQuestionInput, "leftSubjectId" | "middleSubjectId" | "rightSubjectId"> {
  const options = [...distractors];
  options.splice(slot, 0, target);
  return {
    leftSubjectId: options[0]!.subjectId,
    middleSubjectId: hardMode ? options[1]!.subjectId : null,
    rightSubjectId: options[hardMode ? 2 : 1]!.subjectId,
  };
}

export function buildGameQuestions(
  pool: GameCatalogItem[],
  batchSize: number,
  hardMode = false,
  random: RandomSource = Math.random,
): GameQuestionInput[] {
  const minimumItems = hardMode ? 3 : 2;
  if (!Number.isInteger(batchSize) || batchSize < minimumItems) {
    throw new Error(`At least ${minimumItems} eligible items are required.`);
  }
  const targets = shuffleWith(pool, random).slice(0, batchSize);
  if (targets.length < batchSize) throw new Error(`Only ${targets.length} eligible items are available.`);

  return buildGameQuestionsFromTargets(targets, pool, hardMode, random);
}

/**
 * Builds one question per target. Distractors come from the whole pool, so modes
 * that narrow the targets (Revenge) still get high-quality confusable choices.
 */
export function buildGameQuestionsFromTargets(
  targets: GameCatalogItem[],
  pool: GameCatalogItem[],
  hardMode = false,
  random: RandomSource = Math.random,
): GameQuestionInput[] {
  const minimumItems = hardMode ? 3 : 2;
  if (targets.length === 0) {
    throw new Error(`At least ${minimumItems} eligible items are required.`);
  }

  const targetIds = new Set(targets.map((target) => target.subjectId));
  const unusedDistractors = new Set(
    pool.filter((item) => !targetIds.has(item.subjectId)).map((item) => item.subjectId),
  );
  const targetPositions = shuffleWith(
    Array.from({ length: targets.length }, (_, index) => index % (hardMode ? 3 : 2)),
    random,
  );

  return targets.map((target, position) => {
    const chooseNextDistractor = (excludedSubjectIds: Set<number>) => {
      const unusedPool = pool.filter((item) => unusedDistractors.has(item.subjectId) && !excludedSubjectIds.has(item.subjectId));
      const nonTargetPool = pool.filter((item) => !targetIds.has(item.subjectId) && !excludedSubjectIds.has(item.subjectId));
      const fallbackPool = pool.filter((item) => !excludedSubjectIds.has(item.subjectId));
      return chooseDistractor(target, unusedPool, random)
      ?? chooseDistractor(target, nonTargetPool, random)
      ?? chooseDistractor(target, fallbackPool, random);
    };
    const firstDistractor = chooseNextDistractor(new Set([target.subjectId]));
    if (!firstDistractor) throw new Error("Not enough distinct items are available.");
    unusedDistractors.delete(firstDistractor.subjectId);
    const secondDistractor = hardMode
      ? chooseNextDistractor(new Set([target.subjectId, firstDistractor.subjectId]))
      : null;
    if (hardMode && !secondDistractor) throw new Error("Not enough distinct items are available.");
    if (secondDistractor) unusedDistractors.delete(secondDistractor.subjectId);
    const distractors = secondDistractor ? [firstDistractor, secondDistractor] : [firstDistractor];
    const canAskReading = target.subjectType !== SUBJECT_TYPES.radical && Boolean(target.primaryReading) && distractors.every(
      (distractor) => Boolean(distractor.primaryReading) && target.primaryReading !== distractor.primaryReading,
    );
    const answerType = canAskReading && random() < 0.5 ? ANSWER_TYPES.reading : ANSWER_TYPES.meaning;
    return {
      position,
      targetSubjectId: target.subjectId,
      ...toOptionIds(target, distractors, targetPositions[position]!, hardMode),
      answerType,
      promptOverride: null,
    };
  });
}

/**
 * Shiritori chains on `primaryReading` only. A word can carry several accepted
 * readings, but the next link has to be derivable from the answered word alone,
 * so the chain would be ambiguous if any reading could satisfy it.
 */
export function shiritoriChainKeyAfter(item: GameCatalogItem): string | null {
  return item.primaryReading ? shiritoriTailKey(item.primaryReading) : null;
}

export function shiritoriPlayableTargets(
  pool: GameCatalogItem[],
  chainKey: string,
  usedSubjectIds: Set<number>,
): GameCatalogItem[] {
  return pool.filter(
    (item) =>
      !usedSubjectIds.has(item.subjectId) &&
      Boolean(item.primaryReading) &&
      shiritoriReadingIsPlayable(item.primaryReading!, chainKey),
  );
}

export function shiritoriOpeningKeys(pool: GameCatalogItem[]): string[] {
  const heads = new Map<string, number>();
  for (const item of pool) {
    if (!item.primaryReading || shiritoriTailKey(item.primaryReading) === null) continue;
    const head = shiritoriHeadKey(item.primaryReading);
    if (!head) continue;
    heads.set(head, (heads.get(head) ?? 0) + 1);
  }
  return [...heads.entries()].filter(([, count]) => count > 0).map(([head]) => head);
}

export function buildShiritoriQuestion({
  pool,
  chainKey,
  position,
  usedSubjectIds,
  previousItem,
  hardMode,
  random = Math.random,
}: {
  pool: GameCatalogItem[];
  chainKey: string;
  position: number;
  usedSubjectIds: Set<number>;
  previousItem: GameCatalogItem | null;
  hardMode: boolean;
  random?: RandomSource;
}): GameQuestionInput | null {
  const candidates = shiritoriPlayableTargets(pool, chainKey, usedSubjectIds);
  if (candidates.length === 0) return null;
  // Japanese verbs pile up on る while almost nothing starts with it, so a naive
  // pick strands the chain after two or three links. Prefer a word that still
  // leaves an unused continuation, and only accept a dead end when nothing else
  // is left.
  const withContinuation = candidates.filter((candidate) => {
    const nextKey = shiritoriChainKeyAfter(candidate);
    if (!nextKey) return false;
    const nextUsed = new Set(usedSubjectIds);
    nextUsed.add(candidate.subjectId);
    return shiritoriPlayableTargets(pool, nextKey, nextUsed).length > 0;
  });
  const target = pickWith(withContinuation.length > 0 ? withContinuation : candidates, random);
  if (!target) return null;

  const distractorCount = hardMode ? 2 : 1;
  const ranked = pool
    .filter((item) => item.subjectId !== target.subjectId && Boolean(item.primaryReading))
    .map((item) => ({ item, score: shiritoriDistractorScore(item.primaryReading!, chainKey) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, SHIRITORI_DISTRACTOR_SAMPLE);

  const distractors: GameCatalogItem[] = [];
  for (const candidate of shuffleWith(ranked, random)) {
    if (distractors.length >= distractorCount) break;
    if (distractors.some((chosen) => chosen.characters === candidate.item.characters)) continue;
    distractors.push(candidate.item);
  }
  if (distractors.length < distractorCount) return null;

  const previousReading = previousItem?.primaryReading ?? null;
  const promptOverride = previousItem && previousReading
    ? `${previousItem.characters} ${previousReading} → ${chainKey}`
    : `→ ${chainKey}`;

  return {
    position,
    targetSubjectId: target.subjectId,
    ...toOptionIds(target, distractors, Math.floor(random() * (hardMode ? 3 : 2)), hardMode),
    answerType: ANSWER_TYPES.chain,
    promptOverride,
  };
}
