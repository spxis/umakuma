import { jlptCompletedAt } from "@/lib/kanjiLadder";

import {
  cleanSessionUnits,
  jlptMilestoneFor,
  streakMilestoneFor,
  XP_EVENT_NOTES,
  type XpAwardKind,
} from "./xpAwards";

/**
 * Which awards a thing that just happened has earned.
 *
 * Pure on purpose, and separate from the writing in `xpServer.ts`. Deciding
 * "that answer was worth two awards and a burn bonus" is the part with the
 * rules in it, and it is worth being able to test the rules without a
 * database. The study path then hands the list to `awardXpQuietly` and gets on
 * with what it was doing.
 *
 * A request is a kind, how many of it, and optionally what it was for. `times`
 * exists because one action can earn the same kind repeatedly - eleven lessons
 * started in one request is eleven `lessonLearned` awards, each of which has
 * to meet the day's cap on its own rather than being waved through in a lump.
 */

export type XpAwardRequest = {
  kind: XpAwardKind;
  /** How many of this kind the action earned. One unless stated. */
  times?: number;
  /** What this particular award was for, where the kind alone does not say. */
  note?: string;
};

/**
 * What one answered review earned.
 *
 * Answering pays whether or not it was right, because attempting is the habit
 * we are trying to build; being right pays again on top. The two milestones
 * are read off the answer's own consequences rather than looked up afterwards:
 * a burn is an item arriving at the top stage for the first time, and a JLPT
 * band is complete when the level this answer produced covers one the level
 * before it did not.
 */
export function reviewXpAwards({
  correct,
  burnedNow,
  levelBefore,
  levelAfter,
}: {
  correct: boolean;
  /** True when this answer is what carried the item to the top stage. */
  burnedNow: boolean;
  levelBefore: number;
  levelAfter: number;
}): XpAwardRequest[] {
  const awards: XpAwardRequest[] = [{ kind: "reviewAnswered" }];
  if (correct) awards.push({ kind: "reviewCorrect" });
  if (burnedNow) awards.push({ kind: "burnedItem" });

  /* `curriculumLevelGained` is deliberately not awarded here. It is a defined
     routine award with an obvious trigger, and wiring it would put another
     ~10 XP a day on the reference learner, which would take them under the
     three-year target the curve was built against. `balanceSimulator.ts`
     models it; it wants doing with the model, not beside it. */
  if (levelAfter > levelBefore) {
    const reached = jlptCompletedAt(levelAfter);
    /* Only a band the member did not already hold. Re-deriving the level is
       cheap and happens on every answer, so "you have N4" is true far more
       often than "you have just earned N4". */
    if (reached !== null && reached !== jlptCompletedAt(levelBefore)) {
      const kind = jlptMilestoneFor(reached);
      if (kind) awards.push({ kind, note: XP_EVENT_NOTES.jlptComplete(levelAfter, reached) });
    }
  }

  return awards;
}

/** What a batch of lessons earned: one award per item actually started. */
export function lessonXpAwards(started: number): XpAwardRequest[] {
  return started > 0 ? [{ kind: "lessonLearned", times: started }] : [];
}

/** What a finished game earned. */
export function gameXpAwards(): XpAwardRequest[] {
  return [{ kind: "gameFinished" }];
}

/**
 * What a review batch answered with nothing wrong earned.
 *
 * Nothing at all below the minimum batch, and more per item as the batch
 * grows, so the bonus cannot be farmed by reviewing one item at a time.
 */
export function cleanSessionXpAwards({ size, wrong }: { size: number; wrong: number }): XpAwardRequest[] {
  if (wrong > 0) return [];
  const times = cleanSessionUnits(size);
  return times > 0 ? [{ kind: "cleanSession", times, note: XP_EVENT_NOTES.cleanSession(size) }] : [];
}

/** What a streak that has just reached `days` earned, if anything. */
export function streakXpAwards(days: number): XpAwardRequest[] {
  const kind = streakMilestoneFor(days);
  return kind ? [{ kind, note: XP_EVENT_NOTES.streak(days) }] : [];
}
