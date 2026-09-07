import { GRADE_LADDER_LEVELS, jlptMilestonesOnGradeLadder } from "@/lib/gradeLadder";
import { KANJI_LADDER_LEVELS, kanjiLadderMilestones } from "@/lib/kanjiLadder";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";

import type { JlptMilestone } from "./ukGates";

/**
 * Which columns and milestones a ladder uses. Two cases, and that is the point.
 *
 * A subject has a level on each ladder (`UkSubject.level` for UN,
 * `UkSubject.ugLevel` for UG) and a member has a standing on each
 * (`Account.unLevel` / `ugLevel`, with a floor and an updated-at beside each).
 * Every place that used to name `unLevel` or `level` outright - the resolver,
 * the queue, the lesson gate, the sync - asks this instead, so none of them
 * knows there are two ladders, and a third would cost one more case here and
 * one more column, not a search through the codebase.
 *
 * Not a registry. John: at most one more ladder, ever, and "don't over
 * engineer". A function with a switch is the whole abstraction this needs.
 *
 * The milestones matter as much as the columns: the JLPT finals are gates a
 * member must pass, and the bands finish on different levels on each
 * ordering - N4 at 20 on UN, at 43 on UG. Gating a UG member at 20 would hold
 * them for a final they cannot yet have covered.
 */

export type LadderColumns = {
  stream: LadderStreamValue;
  subjectLevel: "level" | "ugLevel";
  accountLevel: "unLevel" | "ugLevel";
  accountFloor: "unLevelFloor" | "ugLevelFloor";
  accountUpdatedAt: "unLevelUpdatedAt" | "ugLevelUpdatedAt";
  maxLevel: number;
  /** Where each JLPT band finishes on this ordering. */
  jlptMilestones: readonly JlptMilestone[];
};

const UN: LadderColumns = {
  stream: LADDER_STREAMS.un,
  subjectLevel: "level",
  accountLevel: "unLevel",
  accountFloor: "unLevelFloor",
  accountUpdatedAt: "unLevelUpdatedAt",
  maxLevel: KANJI_LADDER_LEVELS,
  jlptMilestones: kanjiLadderMilestones(),
};

const UG: LadderColumns = {
  stream: LADDER_STREAMS.ug,
  subjectLevel: "ugLevel",
  accountLevel: "ugLevel",
  accountFloor: "ugLevelFloor",
  accountUpdatedAt: "ugLevelUpdatedAt",
  maxLevel: GRADE_LADDER_LEVELS,
  /* The grade ladder records where each band lands for comparison, and a band
     whose last kanji the ordering never reaches records null. None do today;
     the filter is what keeps a null from becoming a gate at level null. */
  jlptMilestones: jlptMilestonesOnGradeLadder().flatMap((milestone) =>
    milestone.completeAtLevel === null ? [] : [{ nLevel: milestone.nLevel, completeAtLevel: milestone.completeAtLevel }],
  ),
};

export function ladderColumns(stream: LadderStreamValue): LadderColumns {
  return stream === LADDER_STREAMS.ug ? UG : UN;
}

/** Both, for the code that keeps every standing current at once. */
export const ALL_LADDER_COLUMNS: readonly LadderColumns[] = [UN, UG];
