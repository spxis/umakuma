import { kanjiLadderMilestones } from "@/lib/kanjiLadder";
import { checkpointDueAt, type StudyPreferences } from "@/lib/srs/studyPreferences";

/**
 * The tests between a member and the next level.
 *
 * Two kinds, and the difference between them is the whole design:
 *
 * - A **checkpoint** is *written*, not passed. It opens the level whatever the
 *   score, so it costs nothing to sit and is practice rather than a gate. How
 *   often one is offered is the member's own setting — including never.
 * - A **JLPT final** must be passed. Levels 10, 20, 35, 50 and 100 complete
 *   N5 through N1, and "level 35" is a claim that N3 was verified. A member
 *   cannot decline it, because a level that means different things on
 *   different profiles means nothing on any of them.
 *
 * There are no half-band gates. The original plan had five of them at 5, 15,
 * 30, 45 and 75, and they turned out to be the checkpoint by another name:
 * written, not passed, at a fixed interval nobody chose. Making the interval
 * the member's own says the same thing without a second concept.
 */

/** Percent correct required to pass a JLPT final. */
export const UK_TEST_PASS_THRESHOLD = 70;
/** Questions in each kind of test. */
export const UK_CHECKPOINT_QUESTIONS = 12;
export const UK_JLPT_QUESTIONS = 30;
/** Hours before a failed JLPT final may be sat again, with a fresh sample. */
export const UK_JLPT_RETAKE_COOLDOWN_HOURS = 24;

/**
 * Where a JLPT band finishes on some ordering of the ladder.
 *
 * Every function below takes a list of these and defaults to UN's, so the
 * callers that existed before UG had levels keep working unchanged, and the
 * ones that know their stream pass `ladderColumns(stream).jlptMilestones`.
 * The gates sit on different levels per ordering - N4 completes at 20 on UN
 * and 43 on UG - so a hardwired list would hold a UG member for a final
 * covering kanji they have not been taught yet.
 */
export type JlptMilestone = { nLevel: number; completeAtLevel: number };

export type UkGateKind = "checkpoint" | "jlpt_final";

export type UkGate = {
  kind: UkGateKind;
  /** The level whose completion this gate stands after. */
  level: number;
  /** Stable key, so an attempt can be looked up: `check:15` or `jlpt:3`. */
  gateKey: string;
  questionCount: number;
  /** Percent needed. Zero where the test only has to be written. */
  threshold: number;
  mustPass: boolean;
  /** The JLPT level this proves, for a final. */
  nLevel?: number;
  /** The block of levels questions are drawn from. */
  drawsFrom: { firstLevel: number; lastLevel: number };
};

/** The JLPT level that completes at this level, if any. */
export function jlptCompletedAtLevel(
  level: number,
  milestones: readonly JlptMilestone[] = kanjiLadderMilestones(),
): number | null {
  return milestones.find((milestone) => milestone.completeAtLevel === level)?.nLevel ?? null;
}

/** The level at which the previous JLPT band ended, so a final draws from its whole band. */
function bandStartFor(level: number, milestones: readonly JlptMilestone[] = kanjiLadderMilestones()): number {
  const earlier = milestones
    .map((milestone) => milestone.completeAtLevel)
    .filter((at) => at < level);
  return earlier.length === 0 ? 1 : Math.max(...earlier) + 1;
}

/**
 * The gate standing after this level, if there is one.
 *
 * A JLPT final always wins where both would apply: a member finishing level 35
 * sits the N3 final, not a checkpoint on the same day. The checkpoint would
 * have asked twelve questions of the same material the thirty-question test is
 * about to cover.
 */
export function gateAfterLevel(
  level: number,
  preferences: StudyPreferences,
  milestones: readonly JlptMilestone[] = kanjiLadderMilestones(),
): UkGate | null {
  const nLevel = jlptCompletedAtLevel(level, milestones);
  if (nLevel !== null) {
    return {
      kind: "jlpt_final",
      level,
      gateKey: `jlpt:${nLevel}`,
      questionCount: UK_JLPT_QUESTIONS,
      threshold: UK_TEST_PASS_THRESHOLD,
      mustPass: true,
      nLevel,
      /* The whole band, because that is what the claim covers. */
      drawsFrom: { firstLevel: bandStartFor(level, milestones), lastLevel: level },
    };
  }

  if (!checkpointDueAt(level, preferences)) return null;
  return {
    kind: "checkpoint",
    level,
    gateKey: `check:${level}`,
    questionCount: UK_CHECKPOINT_QUESTIONS,
    threshold: 0,
    mustPass: false,
    /* The last few levels, not the whole ladder: a checkpoint is about what
       was just learned. */
    drawsFrom: { firstLevel: Math.max(1, level - 4), lastLevel: level },
  };
}

/** Every level that carries a must-pass gate, whatever a member has chosen. */
export function mandatoryGateLevels(milestones: readonly JlptMilestone[] = kanjiLadderMilestones()): number[] {
  return milestones.map((milestone) => milestone.completeAtLevel).sort((a, b) => a - b);
}

/**
 * Whether a member standing at `level` is held there by an unpassed gate.
 *
 * Only the mandatory ones block. A checkpoint that has not been sat never
 * holds anybody: it opens the level whatever the score, so refusing to
 * advance somebody who declined one would make it a gate after all.
 */
export function blockedByGate(
  level: number,
  passedGateKeys: readonly string[],
  milestones: readonly JlptMilestone[] = kanjiLadderMilestones(),
): boolean {
  const nLevel = jlptCompletedAtLevel(level, milestones);
  if (nLevel === null) return false;
  return !passedGateKeys.includes(`jlpt:${nLevel}`);
}

export type UkTestVerdict = "solid" | "passed" | "nearly" | "not_yet";

/**
 * What a score means, in words first.
 *
 * Following `listGrade.ts`: words before numbers, and never a letter grade or
 * a percentage headline. A member who scores 68 on a 70 bar has not failed an
 * exam, they have nearly got it, and the difference in how that reads is the
 * difference between coming back tomorrow and not.
 */
export function testVerdict(correct: number, total: number, threshold: number): UkTestVerdict {
  if (total <= 0) return "not_yet";
  const percent = (correct / total) * 100;
  if (percent >= 90) return "solid";
  if (percent >= threshold) return "passed";
  if (percent >= 50) return "nearly";
  return "not_yet";
}

/** Whether a verdict clears a gate that must be passed. */
export function verdictClears(verdict: UkTestVerdict, mustPass: boolean): boolean {
  if (!mustPass) return true;
  return verdict === "solid" || verdict === "passed";
}
