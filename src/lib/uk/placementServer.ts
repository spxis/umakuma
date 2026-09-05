import "server-only";

import { isSubjectType, SUBJECT_TYPES } from "@/lib/domainConstants";
import { optionLabel } from "@/lib/gameAnswerText";
import { type GameChoiceCount } from "@/lib/gameBoard";
import { GAME_DIRECTIONS } from "@/lib/gameMode";
import { buildGameQuestionsFromTargets, type GameCatalogItem } from "@/lib/gameQuestionBuilder";
import { shuffleWith } from "@/lib/gameRandom";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

import { planPlacementSeed } from "./placementSeed";
import {
  PLACEMENT_MAX_PROBES,
  PLACEMENT_PROBE_KANJI,
  PLACEMENT_PROBE_SIZE,
  PLACEMENT_PROBE_WORDS,
  nextPlacementStep,
  placementVerdict,
  type PlacementProbeRequest,
  type PlacementProbeResult,
  type PlacementVerdict,
} from "./placementStaircase";
import { createPlacementTicket, readPlacementTicket, type PlacementTicket } from "./placementTicket";
import type { PlacementQuestion, PlacementStepPayload } from "./placementTypes";
import { raiseUkLevelFloor } from "./ukLevelServer";

/**
 * Running a placement test.
 *
 * The staircase decides which rung to ask; this decides what the question is
 * and what the answer buys. Three pieces:
 *
 * - **The pool** is the rung's own five-level block, so the distractors are
 *   things a member at that rung would actually confuse. A word from level 3
 *   beside a word from level 80 is not a question, it is a giveaway.
 * - **The questions** are built by the games' own builder rather than a second
 *   one here. It already balances which tile is right, keeps two tiles from
 *   showing the same English, and prefers confusable distractors, and a
 *   placement test that disagreed with the games about what "hard" means would
 *   be measuring something the site does not teach.
 * - **The verdict** raises the floor through `raiseUkLevelFloor`, the one
 *   writer, and seeds what sits below it. Raise-only throughout: a member who
 *   sits the test twice keeps the better result, and one who imported WaniKani
 *   first keeps every row that import wrote.
 *
 * Read mode with meaning answers, throughout: the glyph is shown and the tiles
 * carry English. Asking a kanji's reading in isolation measures something else
 * — which of several readings we happen to have listed first — and would place
 * a reader who knows the character perfectly well several rungs too low.
 */

const ANSWER_MODE = "meaning";

/**
 * The rung's block, playable.
 *
 * Content comes from `WkSubjectCatalog` where WaniKani teaches the same item
 * and from the row itself where they do not — the jōyō kanji they skip and the
 * words we added. Items with no meaning at all are dropped: a tile whose answer
 * is blank cannot be answered, and it must not be the reason somebody places
 * two rungs low.
 */
async function loadPlacementPool({ fromLevel, toLevel }: PlacementProbeRequest): Promise<GameCatalogItem[]> {
  const rows = await prisma.ukSubject.findMany({
    where: {
      removedAt: null,
      level: { gte: fromLevel, lte: toLevel },
      kind: { in: [SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary] as never },
    },
    select: {
      id: true, kind: true, characters: true, level: true,
      meanings: true, readings: true, wkSubjectId: true,
    },
  });

  const wantedIds = rows
    .filter((row) => row.wkSubjectId !== null && row.meanings.length === 0)
    .map((row) => row.wkSubjectId as number);
  const details: Map<number, { meanings: string[]; readings: string[] }> =
    wantedIds.length === 0 ? new Map() : await getCatalogSubjectDetails(wantedIds).catch(() => new Map());

  return rows.flatMap((row) => {
    if (!isSubjectType(row.kind)) return [];
    const detail = row.wkSubjectId === null ? null : details.get(row.wkSubjectId);
    const meanings = row.meanings.length > 0 ? row.meanings : (detail?.meanings ?? []);
    const readings = row.readings.length > 0 ? row.readings : (detail?.readings ?? []);
    if (meanings.length === 0 || !row.characters.trim()) return [];

    return [{
      subjectId: row.id,
      subjectType: row.kind,
      level: row.level,
      characters: row.characters,
      primaryMeaning: meanings[0] ?? null,
      primaryReading: readings[0] ?? null,
      /* The games key streaks off an assignment; a placement has none, and the
         row id is unique per item, which is all the builder asks of it. */
      assignmentId: row.id,
      srsStage: 0,
      startedAt: new Date(0).toISOString(),
      readings,
      componentSubjectIds: [],
      visuallySimilarSubjectIds: [],
    } satisfies GameCatalogItem];
  });
}

/** Five kanji and three words, topped up from whichever the block has more of. */
function pickTargets(pool: GameCatalogItem[]): GameCatalogItem[] {
  const kanji = shuffleWith(pool.filter((item) => item.subjectType === SUBJECT_TYPES.kanji));
  const words = shuffleWith(pool.filter((item) => item.subjectType === SUBJECT_TYPES.vocabulary));

  const picked = [...kanji.slice(0, PLACEMENT_PROBE_KANJI), ...words.slice(0, PLACEMENT_PROBE_WORDS)];
  const spare = [...kanji.slice(PLACEMENT_PROBE_KANJI), ...words.slice(PLACEMENT_PROBE_WORDS)];
  picked.push(...spare.slice(0, PLACEMENT_PROBE_SIZE - picked.length));
  return shuffleWith(picked);
}

/**
 * One probe's questions, and the answers kept back.
 *
 * The builder throws when it cannot find distinct tiles, so the target count
 * comes down rather than the probe failing: a thin block is a shorter probe
 * held to the same scaled bar, which is what `placementProbePassed` is for.
 */
function buildProbe(
  pool: GameCatalogItem[],
  choiceCount: GameChoiceCount,
): { questions: PlacementQuestion[]; targetSubjectIds: number[] } | null {
  const byId = new Map(pool.map((item) => [item.subjectId, item]));
  const targets = pickTargets(pool);

  for (let size = targets.length; size >= choiceCount; size -= 1) {
    try {
      const built = buildGameQuestionsFromTargets(
        targets.slice(0, size),
        pool,
        choiceCount,
        Math.random,
        GAME_DIRECTIONS.read,
        ANSWER_MODE,
      );

      const questions = built.map((question, position) => ({
        position,
        subjectType: byId.get(question.targetSubjectId)!.subjectType,
        prompt: byId.get(question.targetSubjectId)!.characters,
        options: question.optionSubjectIds.map((subjectId) => ({
          subjectId,
          label: optionLabel(byId.get(subjectId)!, GAME_DIRECTIONS.read, question.answerType),
        })),
      }));

      return { questions, targetSubjectIds: built.map((question) => question.targetSubjectId) };
    } catch {
      /* One fewer target, and try again. */
    }
  }

  return null;
}

/** Issues a probe, or says the test is over. */
async function issueProbe({
  accountId,
  history,
  missedSubjectIds,
  probe,
}: {
  accountId: string;
  history: PlacementProbeResult[];
  missedSubjectIds: number[];
  probe: PlacementProbeRequest;
}): Promise<PlacementStepPayload | null> {
  const pool = await loadPlacementPool(probe);
  const built = buildProbe(pool, probe.choiceCount);
  if (!built) return null;

  const ticket: PlacementTicket = {
    accountId,
    history,
    rung: probe.rung,
    choiceCount: probe.choiceCount,
    targetSubjectIds: built.targetSubjectIds,
    missedSubjectIds,
  };

  return {
    done: false,
    ticket: createPlacementTicket(ticket),
    rung: probe.rung,
    choiceCount: probe.choiceCount,
    probeNumber: history.length + 1,
    maxProbes: PLACEMENT_MAX_PROBES,
    questions: built.questions,
  };
}

/**
 * Writes the result.
 *
 * `createMany` with `skipDuplicates`, which is what makes this raise-only
 * without a comparison: a row that already exists — from a WaniKani import, or
 * from a first sitting — is left exactly as it was. The floor goes through
 * `raiseUkLevelFloor`, which re-derives the level and stamps how they got here.
 */
async function applyVerdict({
  accountId,
  verdict,
  missedSubjectIds,
  now = new Date(),
}: {
  accountId: string;
  verdict: PlacementVerdict;
  missedSubjectIds: number[];
  now?: Date;
}): Promise<PlacementStepPayload> {
  const subjects = await prisma.ukSubject.findMany({
    where: { removedAt: null, level: { lt: verdict.floor } },
    select: { id: true, level: true },
  });

  const plan = planPlacementSeed({
    subjects: subjects.map((subject) => ({ subjectId: subject.id, level: subject.level })),
    floor: verdict.floor,
    missedSubjectIds,
    now,
  });

  const CHUNK = 1_000;
  for (let at = 0; at < plan.rows.length; at += CHUNK) {
    await prisma.ukSrsState.createMany({
      data: plan.rows.slice(at, at + CHUNK).map((row) => ({ accountId, ...row, origin: "placement" as const })),
      skipDuplicates: true,
    });
  }

  const resolved = await raiseUkLevelFloor({ accountId, floor: verdict.floor, source: "placement_test" });

  return {
    done: true,
    floor: verdict.floor,
    level: resolved.level,
    confidence: verdict.confidence,
    probes: verdict.probes,
    seeded: plan.seeded,
    seededMissed: plan.seededMissed,
  };
}

/** The first probe: rung 5, two tiles. */
export async function startPlacement(accountId: string): Promise<PlacementStepPayload | null> {
  const step = nextPlacementStep([]);
  if (step.done) return applyVerdict({ accountId, verdict: step.verdict, missedSubjectIds: [] });
  return issueProbe({ accountId, history: [], missedSubjectIds: [], probe: step.probe });
}

export type PlacementAnswerInput = {
  accountId: string;
  ticket: string;
  /** One chosen option per question, in the order they were shown. */
  chosenSubjectIds: number[];
  /** The member has had enough: score what is answered and stop there. */
  stop: boolean;
};

/**
 * Scores a probe and hands back the next one, or the verdict.
 *
 * A null return means the ticket did not verify, which the route turns into a
 * 400 rather than a guess: a test that carried on from an unreadable ticket
 * would be scoring answers to questions nobody can prove were asked.
 */
export async function answerPlacement({
  accountId,
  ticket,
  chosenSubjectIds,
  stop,
}: PlacementAnswerInput): Promise<PlacementStepPayload | null> {
  const read = readPlacementTicket(ticket, accountId);
  if (!read) return null;

  /* Stopping abandons the probe on screen rather than scoring it half-answered:
     four right out of eight asked is not the same evidence as four out of four,
     and the scaled bar would read it as the second. */
  if (stop) {
    return applyVerdict({
      accountId,
      verdict: placementVerdict(read.history),
      missedSubjectIds: read.missedSubjectIds,
    });
  }

  const asked = read.targetSubjectIds.length;
  const missed = read.targetSubjectIds.filter((target, index) => chosenSubjectIds[index] !== target);
  const result: PlacementProbeResult = {
    rung: read.rung,
    choiceCount: read.choiceCount,
    asked,
    correct: asked - missed.length,
  };

  const history = [...read.history, result];
  const missedSubjectIds = [...read.missedSubjectIds, ...missed];
  const step = nextPlacementStep(history);

  if (step.done) return applyVerdict({ accountId, verdict: step.verdict, missedSubjectIds });

  const issued = await issueProbe({ accountId, history, missedSubjectIds, probe: step.probe });
  /* A rung whose block cannot fill a probe ends the test where it stands
     rather than looping: the verdict already knows what was passed. */
  return issued ?? applyVerdict({ accountId, verdict: placementVerdict(history), missedSubjectIds });
}
