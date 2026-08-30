import { candidateAnswerTypes, labelsAreDistinct } from "@/lib/gameAnswerText";
import { geoDistractorScore, type GeoScorable } from "@/lib/geoDistractors";
import {
  GAME_DIRECTIONS,
  type GameAnswerMode,
  type GameAnswerType,
  type GameChoiceCount,
  type GameDirection,
} from "@/lib/gameMode";
import type { GameQuestionInput } from "@/lib/gameQuestionBuilder";
import { pickWith, shuffleWith, type RandomSource } from "@/lib/gameRandom";
import {
  JAPAN_MAP,
  JAPAN_PREFECTURES,
  mapSubjectId,
  prefectureOption,
  type JapanPrefecture,
} from "@/lib/japanPrefectures";

/**
 * What makes a prefecture a convincing wrong answer.
 *
 * Somewhere on the far side of the country is never tempting, so the choices are
 * drawn from the target's own corner of the map: its land neighbours first, then
 * its region, then whatever is nearest. It also keeps the Find board tight, because
 * the tiles are places on one map and clustered candidates stay legible.
 */
/** How many of the top-scoring candidates to choose between, for variety. */
const DISTRACTOR_TOP_SAMPLE = 6;

const MAP_DIAGONAL = Math.hypot(JAPAN_MAP.width, JAPAN_MAP.height);

/** A prefecture answers by English name or by kana; see `GAME_MAP_ANSWER_MODES`. */
const MAP_ANSWER_TYPES: GameAnswerType[] = ["meaning", "reading"];

function prefectureScorable(prefecture: JapanPrefecture): GeoScorable {
  return {
    code: prefecture.code,
    region: prefecture.region,
    centroid: prefecture.centroid,
    neighbors: prefecture.neighbors,
  };
}

export function mapDistractorScore(target: JapanPrefecture, candidate: JapanPrefecture): number {
  return geoDistractorScore(prefectureScorable(target), prefectureScorable(candidate), MAP_DIAGONAL);
}

function chooseDistractor(
  target: JapanPrefecture,
  pool: JapanPrefecture[],
  random: RandomSource,
): JapanPrefecture | null {
  const ranked = pool
    .filter((candidate) => candidate.code !== target.code)
    .map((candidate) => ({ candidate, score: mapDistractorScore(target, candidate) }))
    .sort((left, right) => right.score - left.score);
  if (ranked.length === 0) return null;
  return pickWith(ranked.slice(0, DISTRACTOR_TOP_SAMPLE), random)?.candidate ?? ranked[0]!.candidate;
}

function toOptionIds(
  target: JapanPrefecture,
  distractors: JapanPrefecture[],
  slot: number,
): Pick<GameQuestionInput, "optionSubjectIds" | "leftSubjectId" | "middleSubjectId" | "rightSubjectId"> {
  const options = [...distractors];
  options.splice(slot, 0, target);
  const ids = options.map((option) => mapSubjectId(option.code));
  return {
    optionSubjectIds: ids,
    leftSubjectId: ids[0]!,
    middleSubjectId: ids.length > 2 ? ids[1]! : null,
    rightSubjectId: ids[ids.length - 1]!,
  };
}

/**
 * One question per target prefecture.
 *
 * The map is the glyph side, so the run's direction carries over from the other
 * games unchanged: Read highlights a prefecture and asks for its name, Find names
 * a prefecture and asks the player to pick it out on the map.
 */
export function buildMapQuestionsFromTargets(
  targets: JapanPrefecture[],
  pool: JapanPrefecture[],
  choiceCount: GameChoiceCount = 2,
  random: RandomSource = Math.random,
  direction: GameDirection = GAME_DIRECTIONS.read,
  answerMode: GameAnswerMode = "auto",
): GameQuestionInput[] {
  if (targets.length === 0) throw new Error("No eligible items are available.");
  if (pool.length < choiceCount) {
    throw new Error(`At least ${choiceCount} eligible items are required.`);
  }

  const targetCodes = new Set(targets.map((target) => target.code));
  const unusedDistractors = new Set(
    pool.filter((entry) => !targetCodes.has(entry.code)).map((entry) => entry.code),
  );
  // Spread the correct answer evenly across the tiles.
  const targetSlots = shuffleWith(
    Array.from({ length: targets.length }, (_, index) => index % choiceCount),
    random,
  );

  return targets.map((target, position) => {
    const chooseNextDistractor = (excluded: Set<number>, accept: (entry: JapanPrefecture) => boolean) => {
      const usable = (entry: JapanPrefecture) => !excluded.has(entry.code) && accept(entry);
      // Prefer prefectures not yet used, so a round covers more of the country,
      // then fall back so a small pool can still fill every tile.
      const unusedPool = pool.filter((entry) => unusedDistractors.has(entry.code) && usable(entry));
      const nonTargetPool = pool.filter((entry) => !targetCodes.has(entry.code) && usable(entry));
      return chooseDistractor(target, unusedPool, random)
        ?? chooseDistractor(target, nonTargetPool, random)
        ?? chooseDistractor(target, pool.filter(usable), random);
    };

    // Settle the answer type first: it decides which text the tiles carry, and
    // two tiles must never read the same.
    const targetOption = prefectureOption(target);
    let answerType: GameAnswerType | null = null;
    let distractors: JapanPrefecture[] = [];

    const usableAnswerTypes = candidateAnswerTypes(targetOption, answerMode)
      .filter((type) => MAP_ANSWER_TYPES.includes(type));
    for (const candidate of shuffleWith(usableAnswerTypes, random)) {
      const excluded = new Set([target.code]);
      const picked: JapanPrefecture[] = [];
      const accept = (entry: JapanPrefecture) =>
        labelsAreDistinct(
          [targetOption, ...picked.map(prefectureOption), prefectureOption(entry)],
          direction,
          candidate,
        );

      while (picked.length < choiceCount - 1) {
        const next = chooseNextDistractor(excluded, accept);
        if (!next) break;
        excluded.add(next.code);
        picked.push(next);
      }

      if (picked.length === choiceCount - 1) {
        answerType = candidate;
        distractors = picked;
        break;
      }
    }

    if (!answerType || distractors.length !== choiceCount - 1) {
      throw new Error("Not enough distinct prefectures are available.");
    }
    for (const distractor of distractors) unusedDistractors.delete(distractor.code);

    return {
      position,
      targetSubjectId: mapSubjectId(target.code),
      answerType,
      promptOverride: null,
      ...toOptionIds(target, distractors, targetSlots[position]!),
    };
  });
}

export function buildMapQuestions(
  batchSize: number,
  choiceCount: GameChoiceCount = 2,
  random: RandomSource = Math.random,
  direction: GameDirection = GAME_DIRECTIONS.read,
  answerMode: GameAnswerMode = "auto",
  pool: JapanPrefecture[] = JAPAN_PREFECTURES,
): GameQuestionInput[] {
  const targetCount = Math.min(Math.trunc(batchSize), pool.length);
  if (targetCount < 1) throw new Error("No eligible items are available.");
  const targets = shuffleWith(pool, random).slice(0, targetCount);
  return buildMapQuestionsFromTargets(targets, pool, choiceCount, random, direction, answerMode);
}
