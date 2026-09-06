import { UN_LEVEL_PASS_SRS_STAGE } from "./unLevel";

/**
 * What a placement result writes into a member's reviews.
 *
 * The test says where somebody sits; it does not say they have nothing left to
 * do below that. So everything under the floor arrives as state rather than as
 * a clean slate, at Guru and due in a week — which is the site checking its own
 * answer. If the placement over-reached, the member finds out in one review
 * session rather than three months later, and the SRS pulls the item back down
 * on its own.
 *
 * The items they actually got wrong are the exception, and they are the whole
 * reason the seeding is worth doing at all: those come in at the bottom stage
 * and due immediately, so the first review session is the eight-or-so things
 * the test already knows they cannot do, not four thousand things it assumed
 * they could.
 *
 * Pure, so the shape of what gets written can be tested without a database —
 * the same split `ukImport.ts` takes for the same reason.
 */

/** Guru. What "we think you already know this" is worth on the SRS. */
export const PLACEMENT_SEED_STAGE = UN_LEVEL_PASS_SRS_STAGE;
/** The bottom stage, for what the test saw them miss. */
export const PLACEMENT_MISSED_STAGE = 1;
/** Long enough that the seed is not a wall of reviews on day one. */
export const PLACEMENT_SEED_DELAY_DAYS = 7;

export type PlacementSeedSubject = {
  subjectId: number;
  level: number;
};

export type PlacementSeedRow = {
  subjectId: number;
  srsStage: number;
  availableAt: Date;
  unlockedAt: Date;
  startedAt: Date;
};

export type PlacementSeedPlan = {
  rows: PlacementSeedRow[];
  /** Items credited at Guru. */
  seeded: number;
  /** Items the test saw missed, seeded at the bottom and due now. */
  seededMissed: number;
};

/**
 * The rows a placement writes.
 *
 * Only what sits **below** the floor: an item the member missed at a rung they
 * did not pass is above their level, and seeding it would put work in front of
 * them that the ladder has not unlocked. It will arrive as a lesson when they
 * get there.
 *
 * `passedAt` is deliberately not stamped. The stage is enough for the level
 * gate, and claiming a pass date for an item the member never answered would
 * make the credit permanent — an item that turns out to be over-credited should
 * be able to fall back out of its level, and only the floor should hold.
 */
export function planPlacementSeed({
  subjects,
  floor,
  missedSubjectIds,
  now = new Date(),
}: {
  subjects: readonly PlacementSeedSubject[];
  floor: number;
  missedSubjectIds: readonly number[];
  now?: Date;
}): PlacementSeedPlan {
  const missed = new Set(missedSubjectIds);
  const later = new Date(now.getTime() + PLACEMENT_SEED_DELAY_DAYS * 24 * 60 * 60_000);

  const rows = subjects
    .filter((subject) => subject.level < floor)
    .map((subject) => {
      const wasMissed = missed.has(subject.subjectId);
      return {
        subjectId: subject.subjectId,
        srsStage: wasMissed ? PLACEMENT_MISSED_STAGE : PLACEMENT_SEED_STAGE,
        availableAt: wasMissed ? now : later,
        unlockedAt: now,
        startedAt: now,
      };
    });

  return {
    rows,
    seeded: rows.filter((row) => row.srsStage === PLACEMENT_SEED_STAGE).length,
    seededMissed: rows.filter((row) => row.srsStage === PLACEMENT_MISSED_STAGE).length,
  };
}
