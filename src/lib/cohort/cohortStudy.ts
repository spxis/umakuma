import { REVIEW_RESULTS, SUBJECT_TYPES } from "@/lib/domainConstants";
import type { RandomSource } from "@/lib/gameRandom";
import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { type LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { initialLessonState, nextSrsStage, nextStageAvailableAt, SRS_BURNED_STAGE } from "@/lib/srs/srsSchedule";
import { planPlacementSeed } from "@/lib/uk/placementSeed";
import { resolveUnLevel, UN_LEVEL_PASS_SRS_STAGE, type UkLevelTotals } from "@/lib/uk/unLevel";
import { lessonXpAwards, reviewXpAwards } from "@/lib/xp/xpStudyAwards";

import type { CohortLedger } from "./cohortLedger";
import type { CohortPersona } from "./cohortPersona";
import { ladderColumns } from "@/lib/uk/ladderColumns";
import { testVerdict, verdictClears, UK_JLPT_QUESTIONS, UK_TEST_PASS_THRESHOLD, type UkTestVerdict } from "@/lib/uk/ukGates";

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
 * bonus has no caller on the site, so nobody here earns it.
 *
 * Level tests **are** sat, because not sitting them made the simulation stop.
 * A JLPT final is mandatory, so a member who reached UN level 10 stayed there
 * for ever however long they studied - six of eleven members piled onto that
 * one rung and no simulated member could ever exist above it. A real member
 * sits the test; so does this one, at the accuracy their persona reads and
 * with a retake when they fall short.
 */

/** A curriculum item and where it sits on each ladder. */
export type CohortSubject = { id: number; kind: string; level: number; ugLevel: number };

/**
 * A level test this member sat, waiting to be written.
 *
 * Only the finals are recorded. A checkpoint opens its level whatever the
 * score, so it changes nothing about where anybody stands and a row for it
 * would be noise in a table the gate check reads.
 */
export type CohortTest = {
  gateKey: string;
  level: number;
  attempt: number;
  questionCount: number;
  correctCount: number;
  threshold: number;
  verdict: UkTestVerdict;
  satAt: Date;
};

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
  /**
   * How many kanji and radicals each level holds, per ladder.
   *
   * Both, because a member's standing is derived on both and the two ladders
   * put different subjects on a given level - UN's level 7 is not UG's.
   */
  totals: Readonly<Record<LadderStreamValue, readonly UkLevelTotals[]>>;
};

export type CohortMember = {
  persona: CohortPersona;
  states: Map<number, CohortStateRow>;
  /** Answers given this run, not yet written. */
  attempts: CohortAttempt[];
  /** Finals sat this run, not yet written. */
  tests: CohortTest[];
  /** Gate keys already cleared, as `jlpt:5`. What lets the walk past a final. */
  passedGates: Set<string>;
  floor: number;
  level: number;
  placedAt: Date | null;
  ledger: CohortLedger;
  /**
   * The best this member has scored at each game so far, for `personalBest`.
   *
   * Held per member rather than queried per run, because the simulation plays
   * a member's whole history in order and already knows every score it wrote.
   * A kind absent from the map has no previous best, which is not a best of
   * zero: a first run has nothing to beat, and treating it as zero would pay
   * fifty XP for merely finishing one of each game.
   */
  bestScores: Map<string, number>;
  lastActivityAt: Date | null;
};

export type SessionOutcome = { reviews: number; correct: number; lessons: number; levelledUp: boolean };

/** Mirrors `deriveUnLevel`: the level the rows imply, from the floor up. */
/**
 * Where this member stands, in full - including whether a gate is holding them.
 *
 * `resolvedLevel` is this with the level taken off the front; the sitting of
 * a final needs the rest, because "held at 10 by jlpt:5" and "at 10 with more
 * to learn" are the same number and different situations.
 */
export function memberStanding(member: CohortMember, world: CohortWorld) {
  /*
   * On the ladder this member follows, which the site has done since 1.55.0.
   *
   * It resolved every member against UN: their subjects' UN levels, UN's
   * per-level totals and, by omission, UN's JLPT gates - so a UG persona was
   * simulated climbing the JLPT ordering and gated at UN's milestone levels,
   * where N4 finishes at 20 rather than UG's 43. `ladderColumns` is the same
   * lookup `deriveLadderLevel` uses, so the simulation and the site cannot
   * answer this differently.
   */
  const columns = ladderColumns(member.persona.stream);
  const byId = new Map(world.subjects.map((subject) => [subject.id, subject]));
  const rows = [...member.states.values()].flatMap((state) => {
    const subject = byId.get(state.subjectId);
    return subject
      ? [{
          level: subject[columns.subjectLevel],
          kind: subject.kind,
          srsStage: state.srsStage,
          passedAt: state.passedAt,
        }]
      : [];
  });
  return resolveUnLevel({
    rows,
    totals: world.totals[columns.stream],
    floor: member.floor,
    maxLevel: columns.maxLevel,
    milestones: columns.jlptMilestones,
    passedGateKeys: [...member.passedGates],
  });
}

export function resolvedLevel(member: CohortMember, world: CohortWorld): number {
  return memberStanding(member, world).level;
}

/**
 * Sits the final that is holding this member, if one is.
 *
 * Their persona's accuracy is what they bring to it, softened a little because
 * a test samples the whole band rather than what they revised yesterday. A
 * failure is kept as a row and retaken on a later session, exactly as the
 * cooldown intends - so a weak member takes several goes at N5 and a strong
 * one passes first time, which is the spread the boards should show.
 */
export function sitHeldGate(member: CohortMember, world: CohortWorld, at: Date, random: RandomSource): boolean {
  const standing = memberStanding(member, world);
  if (!standing.heldByGate) return false;

  const attempt = member.tests.filter((test) => test.gateKey === standing.heldByGate).length + 1;
  const accuracy = Math.max(0, Math.min(1, member.persona.accuracy - 0.05 + random() * 0.1));
  const correct = Math.round(UK_JLPT_QUESTIONS * accuracy);
  const verdict = testVerdict(correct, UK_JLPT_QUESTIONS, UK_TEST_PASS_THRESHOLD);

  member.tests.push({
    gateKey: standing.heldByGate,
    level: standing.level,
    attempt,
    questionCount: UK_JLPT_QUESTIONS,
    correctCount: correct,
    threshold: UK_TEST_PASS_THRESHOLD,
    verdict,
    satAt: at,
  });

  if (!verdictClears(verdict, true)) return false;
  member.passedGates.add(standing.heldByGate);
  member.level = resolvedLevel(member, world);
  return true;
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
    /* The persona's own stream, matching what `recordUkReview` now stamps.
       It mirrored the old hardcoded UN, so two in five simulated members -
       the UG ones - were filing answers against a ladder they were not on,
       and the boards reading those rows would have believed it. */
    curriculumStream: member.persona.stream,
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

  /* Before lessons, because passing the final is what opens the next level's
     items - a member held at a gate has nothing new to learn until they sit
     it. Only after some reviews: nobody sits a final on a day they did not
     study, and the retake cooldown is a day, so one attempt per session. */
  if (outcome.reviews > 0 && sitHeldGate(member, world, tick(), random)) outcome.levelledUp = true;

  if (withLessons) {
    const wanted = Math.max(0, Math.round(member.persona.lessonsPerDay * (0.5 + random() * 0.7)));
    const when = tick();
    outcome.lessons = takeLessons(member, openLessons(member, world).slice(0, wanted), when);
    if (outcome.lessons > 0) member.ledger.settleDay(when, dueStates(member, when).length);
  }

  member.lastActivityAt = new Date(clock);
  return outcome;
}
