import { REVIEW_RESULTS, SUBJECT_TYPES } from "@/lib/domainConstants";
import type { RandomSource } from "@/lib/gameRandom";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { initialLessonState, nextSrsStage, nextStageAvailableAt, SRS_BURNED_STAGE } from "@/lib/srs/srsSchedule";
import { planPlacementSeed } from "@/lib/uk/placementSeed";
import { resolveUnLevel, UN_LEVEL_PASS_SRS_STAGE, type UkLevelTotals } from "@/lib/uk/unLevel";
import { lessonXpAwards, reviewXpAwards } from "@/lib/xp/xpStudyAwards";

import type { CohortLedger } from "./cohortLedger";
import type { CohortPersona } from "./cohortPersona";

/**
 * A simulated member studying, in memory.
 *
 * Each function names the server function it mirrors - `startUkLessons`,
 * `recordUkReview`, `applyVerdict` in the placement server - and applies the
 * same rule modules those functions import: the SRS schedule, the level
 * resolution, the XP composition. The site's arithmetic is not copied here;
 * only the orchestration is, which is the part a round trip per answer would
 * make too slow to replay over a hundred days for thirty members.
 *
 * What the site does not do, this does not do either. The clean-session
 * bonus has no caller on the site, so nobody here earns it. Level tests are
 * not sat, so a member who reaches a JLPT gate stays on it, the way a member
 * who has not clicked "sit the test" does.
 */

export type CohortSubject = { id: number; kind: string; level: number };

export type CohortStateRow = {
  /** Null until the row has been written. */
  id: number | null;
  subjectId: number;
  srsStage: number;
  availableAt: Date | null;
  unlockedAt: Date;
  startedAt: Date;
  passedAt: Date | null;
  burnedAt: Date | null;
  lastReviewedAt: Date | null;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  origin: "lesson" | "placement";
  /** Changed since it was loaded, so it needs writing. New rows are dirty too. */
  dirty: boolean;
};

export type CohortAttempt = {
  subjectId: number;
  previousSrsStage: number;
  newSrsStage: number;
  result: "correct" | "wrong";
  submittedAt: Date;
  curriculumStream: LadderStreamValue;
  curriculumVersion: string;
};

export type CohortWorld = {
  subjects: readonly CohortSubject[];
  totals: readonly UkLevelTotals[];
};

export type CohortMember = {
  persona: CohortPersona;
  states: Map<number, CohortStateRow>;
  /** Answers given this run, not yet written. */
  attempts: CohortAttempt[];
  floor: number;
  level: number;
  placedAt: Date | null;
  ledger: CohortLedger;
  lastActivityAt: Date | null;
};

export type SessionOutcome = { reviews: number; correct: number; lessons: number; levelledUp: boolean };

/** Mirrors `deriveUnLevel`: the level the rows imply, from the floor up. */
export function resolvedLevel(member: CohortMember, world: CohortWorld): number {
  const byId = new Map(world.subjects.map((subject) => [subject.id, subject]));
  const rows = [...member.states.values()].flatMap((state) => {
    const subject = byId.get(state.subjectId);
    return subject
      ? [{ level: subject.level, kind: subject.kind, srsStage: state.srsStage, passedAt: state.passedAt }]
      : [];
  });
  return resolveUnLevel({ rows, totals: world.totals, floor: member.floor }).level;
}

/**
 * How likely this member is to remember this item right now.
 *
 * Radicals are easier than words, an item at a long interval is harder than
 * one seen yesterday, and an item the placement test credited without ever
 * asking is a little shakier than one the member learned here.
 */
export function recallProbability(persona: CohortPersona, state: CohortStateRow, subject: CohortSubject): number {
  let p = persona.accuracy;
  if (subject.kind === SUBJECT_TYPES.radical) p += 0.05;
  if (subject.kind === SUBJECT_TYPES.vocabulary) p -= 0.05;
  if (state.srsStage >= 6) p -= 0.05;
  if (state.origin === "placement" && state.reviewCount === 0) p -= 0.03;
  return Math.min(0.99, Math.max(0.5, p));
}

/**
 * Mirrors `applyVerdict` and `raiseUkLevelFloor` for a member who arrives
 * knowing some Japanese: everything below the floor is seeded at Guru and
 * due in a week, a few kanji the test "saw them miss" come in at the bottom
 * and due now, and the placement award is paid once.
 */
export function applyPlacement(member: CohortMember, world: CohortWorld, at: Date, random: RandomSource): void {
  const floor = member.persona.placementFloor;
  if (floor <= 1 || member.placedAt !== null) return;

  const below = world.subjects.filter((subject) => subject.level < floor);
  const missed = below
    .filter((subject) => subject.kind === SUBJECT_TYPES.kanji && random() < 0.06)
    .map((subject) => subject.id);
  const plan = planPlacementSeed({
    subjects: below.map((subject) => ({ subjectId: subject.id, level: subject.level })),
    floor,
    missedSubjectIds: missed,
    now: at,
  });

  for (const row of plan.rows) {
    if (member.states.has(row.subjectId)) continue;
    member.states.set(row.subjectId, {
      id: null,
      subjectId: row.subjectId,
      srsStage: row.srsStage,
      availableAt: row.availableAt,
      unlockedAt: row.unlockedAt,
      startedAt: row.startedAt,
      passedAt: null,
      burnedAt: null,
      lastReviewedAt: null,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      origin: "placement",
      dirty: true,
    });
  }

  member.floor = Math.max(member.floor, floor);
  member.placedAt = at;
  member.ledger.award("placementAward", at, `placed at level ${floor}`);
  member.level = resolvedLevel(member, world);
}

/** Reviews due at `at`, most overdue first - what `ukReviews` serves. */
export function dueStates(member: CohortMember, at: Date): CohortStateRow[] {
  return [...member.states.values()]
    .filter((state) => state.availableAt !== null && state.availableAt <= at)
    .sort((a, b) => a.availableAt!.getTime() - b.availableAt!.getTime());
}

/** Items at or below the level with no row - what `ukLessons` serves, in its order. */
export function openLessons(member: CohortMember, world: CohortWorld): CohortSubject[] {
  const order = [SUBJECT_TYPES.radical, SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary] as string[];
  return world.subjects
    .filter((subject) => subject.level <= member.level && !member.states.has(subject.id))
    .sort((a, b) => a.level - b.level || order.indexOf(a.kind) - order.indexOf(b.kind) || a.id - b.id);
}

/** Mirrors `recordUkReview`: the stage moves, the answer is kept, the level is re-derived, XP is paid. */
export function answerReview(
  member: CohortMember,
  world: CohortWorld,
  state: CohortStateRow,
  correct: boolean,
  at: Date,
): boolean {
  const previousSrsStage = state.srsStage;
  const newSrsStage = nextSrsStage({ currentStage: previousSrsStage, result: correct ? REVIEW_RESULTS.correct : REVIEW_RESULTS.wrong });
  const burnedNow = newSrsStage >= SRS_BURNED_STAGE && state.burnedAt === null;
  const passedNow = state.passedAt === null && newSrsStage >= UN_LEVEL_PASS_SRS_STAGE;

  state.srsStage = newSrsStage;
  state.availableAt = nextStageAvailableAt(newSrsStage, at);
  state.lastReviewedAt = at;
  state.reviewCount += 1;
  if (correct) state.correctCount += 1;
  else state.wrongCount += 1;
  if (passedNow) state.passedAt = at;
  if (burnedNow) state.burnedAt = at;
  state.dirty = true;

  member.attempts.push({
    subjectId: state.subjectId,
    previousSrsStage,
    newSrsStage,
    result: correct ? REVIEW_RESULTS.correct : REVIEW_RESULTS.wrong,
    submittedAt: at,
    /* What the site stamps today: UN until a member can choose UG, whatever
       the persona would pick. See `recordUkReview`. */
    curriculumStream: LADDER_STREAMS.un,
    curriculumVersion: CURRICULUM_VERSION,
  });

  /* The level can only move when an item first reaches Guru, so it is only
     re-derived then; every other answer leaves the gate count where it was. */
  const levelBefore = member.level;
  if (passedNow) member.level = resolvedLevel(member, world);
  member.ledger.awardAll(reviewXpAwards({ correct, burnedNow, levelBefore, levelAfter: member.level }), at);
  return member.level > levelBefore;
}

/** Mirrors `startUkLessons` for a batch of items. */
export function takeLessons(member: CohortMember, subjects: readonly CohortSubject[], at: Date): number {
  const state = initialLessonState(at);
  let started = 0;
  for (const subject of subjects) {
    if (member.states.has(subject.id)) continue;
    member.states.set(subject.id, {
      id: null,
      subjectId: subject.id,
      srsStage: state.srsStage,
      availableAt: state.availableAt,
      unlockedAt: state.unlockedAt,
      startedAt: state.startedAt,
      passedAt: null,
      burnedAt: null,
      lastReviewedAt: null,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      origin: "lesson",
      dirty: true,
    });
    started += 1;
  }
  member.ledger.awardAll(lessonXpAwards(started), at);
  return started;
}

/**
 * One sitting: the reviews that are due, up to what this member will face in
 * one go, then a batch of lessons if this is the day's first sitting. Each
 * answer settles the day the way the site does after every answer.
 */
export function studySession({
  member,
  world,
  at,
  random,
  withLessons,
}: {
  member: CohortMember;
  world: CohortWorld;
  at: Date;
  random: RandomSource;
  withLessons: boolean;
}): SessionOutcome {
  const byId = new Map(world.subjects.map((subject) => [subject.id, subject]));
  const outcome: SessionOutcome = { reviews: 0, correct: 0, lessons: 0, levelledUp: false };
  /* Answers a few seconds apart, so a session has a length. */
  let clock = at.getTime();
  const tick = () => {
    clock += 4_000 + Math.floor(random() * 9_000);
    return new Date(clock);
  };

  const cap = Math.round(member.persona.reviewCap * (0.7 + random() * 0.5));
  for (const state of dueStates(member, at).slice(0, cap)) {
    const subject = byId.get(state.subjectId);
    if (!subject) continue;
    const correct = random() < recallProbability(member.persona, state, subject);
    const when = tick();
    if (answerReview(member, world, state, correct, when)) outcome.levelledUp = true;
    outcome.reviews += 1;
    if (correct) outcome.correct += 1;
    member.ledger.settleDay(when, dueStates(member, when).length);
  }

  if (withLessons) {
    const wanted = Math.max(0, Math.round(member.persona.lessonsPerDay * (0.5 + random() * 0.7)));
    const when = tick();
    outcome.lessons = takeLessons(member, openLessons(member, world).slice(0, wanted), when);
    if (outcome.lessons > 0) member.ledger.settleDay(when, dueStates(member, when).length);
  }

  member.lastActivityAt = new Date(clock);
  return outcome;
}
