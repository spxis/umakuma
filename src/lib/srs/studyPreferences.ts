/**
 * What a member may choose about how they study — and what they may not.
 *
 * John, 2026-09-04: *"We should allow users to choose the way they want to
 * study themselves… I understand this could see another user's progress
 * differently so we need to think about that."*
 *
 * That concern is the whole design, so here is the line, drawn once:
 *
 * **A member may change their experience and their pace. A member may not
 * change what a level means.**
 *
 * UmaKuma level 40 has to mean the same thing for everybody, or the badges,
 * the leaderboard, the JLPT milestones and every comparison between two people
 * quietly stop meaning anything. So the gate — 90% of a level's kanji at Guru,
 * the latch, the intervals, the demotion — is site-wide and admin-only, in
 * `srsScoringRules.ts`. Nothing here can reach it.
 *
 * What *is* here divides into two kinds, and the distinction is worth keeping:
 *
 * - **Ergonomics.** The order reviews arrive in, how many at a time, whether a
 *   leech is flagged on screen. These change how studying feels and nothing
 *   else. Two members with different settings who answer the same items the
 *   same way end up in exactly the same place.
 * - **Pace.** The backlog throttle and the daily lesson cap. These change how
 *   *fast* somebody takes on new work — which is the same freedom as choosing
 *   to study for twenty minutes instead of an hour, and nobody thinks that
 *   makes a level worth less.
 *
 * Test frequency is where the line does real work, so it is split rather than
 * offered whole. A member sets how often they want a **checkpoint** — off, or
 * every level, or every second, third, fifth or tenth — because a checkpoint
 * is written rather than passed and opens the level whatever the score. It is
 * practice they asked for. The **JLPT majors** at levels 10, 20, 35, 50 and
 * 100 are not in here and cannot be: "level 35" carries the claim that N3 was
 * verified, and a member who switched that off would hold a level that means
 * something different from everybody else's. Those stay site-wide.
 *
 * The test that keeps the line honest is in `studyPreferences.test.ts`: no key
 * defined here may appear anywhere in `ukLevel.ts`. If a preference ever needs
 * to, it is not a preference.
 */

export const STUDY_REVIEW_ORDERS = {
  /** Most overdue first. Anki calls this relative overdueness and recommends it for a backlog. */
  overdue: "overdue",
  /** Lowest SRS stage first, which is what WaniKani offers. */
  lowestStage: "lowestStage",
  /** Shuffled, so nothing is predictable. */
  shuffled: "shuffled",
} as const;

export type StudyReviewOrder = (typeof STUDY_REVIEW_ORDERS)[keyof typeof STUDY_REVIEW_ORDERS];

/**
 * How often a member wants a checkpoint, in levels. Zero is none.
 *
 * Only the optional checkpoints. The JLPT majors are not configurable here —
 * see the note at the top of this file for why.
 */
export const STUDY_TEST_INTERVALS = [0, 1, 2, 3, 5, 10] as const;
export type StudyTestInterval = (typeof STUDY_TEST_INTERVALS)[number];

export type StudyPreferences = {
  reviewOrder: StudyReviewOrder;
  /** Levels between checkpoints. 0 means none; the JLPT majors happen regardless. */
  testInterval: StudyTestInterval;
  /** Items in one sitting. Ergonomic: a smaller batch is a shorter session, not an easier one. */
  batchSize: number;
  /**
   * Hold lessons back while reviews are waiting.
   *
   * Pace, not standard. `"site"` follows whatever an admin has set, which is
   * the honest default — most members should not have to hold an opinion
   * about this, and the site's answer is the one that has been measured.
   */
  throttleLessons: "site" | "on" | "off";
  /** Most new items to start in a day. Zero means no limit of their own. */
  dailyLessonCap: number;
  /** Whether an item flagged as a leech is marked on screen for them. */
  showLeechFlag: boolean;
};

export const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  reviewOrder: STUDY_REVIEW_ORDERS.overdue,
  /* Five, the plan's original interval - offered rather than imposed. */
  testInterval: 5,
  batchSize: 10,
  throttleLessons: "site",
  dailyLessonCap: 0,
  showLeechFlag: true,
};

const BATCH_BOUNDS = { min: 3, max: 50 };
const LESSON_CAP_BOUNDS = { min: 0, max: 200 };

function bounded(value: unknown, bounds: { min: number; max: number }, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), bounds.min), bounds.max);
}

/**
 * A stored preference set that has lost its shape reads as the defaults.
 *
 * Read on the path that builds a review queue, so a malformed value must not
 * be able to stop somebody studying — and a member who has never chosen
 * anything is the common case, not an error.
 */
export function parseStudyPreferences(raw: string | null | undefined): StudyPreferences {
  if (!raw) return DEFAULT_STUDY_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<StudyPreferences>;
    const order = parsed.reviewOrder;
    const interval = parsed.testInterval;
    return {
      testInterval: (STUDY_TEST_INTERVALS as readonly number[]).includes(interval as number)
        ? (interval as StudyTestInterval)
        : DEFAULT_STUDY_PREFERENCES.testInterval,
      reviewOrder:
        typeof order === "string" && (Object.values(STUDY_REVIEW_ORDERS) as string[]).includes(order)
          ? (order as StudyReviewOrder)
          : DEFAULT_STUDY_PREFERENCES.reviewOrder,
      batchSize: bounded(parsed.batchSize, BATCH_BOUNDS, DEFAULT_STUDY_PREFERENCES.batchSize),
      throttleLessons:
        parsed.throttleLessons === "on" || parsed.throttleLessons === "off" ? parsed.throttleLessons : "site",
      dailyLessonCap: bounded(parsed.dailyLessonCap, LESSON_CAP_BOUNDS, DEFAULT_STUDY_PREFERENCES.dailyLessonCap),
      showLeechFlag:
        typeof parsed.showLeechFlag === "boolean" ? parsed.showLeechFlag : DEFAULT_STUDY_PREFERENCES.showLeechFlag,
    };
  } catch {
    return DEFAULT_STUDY_PREFERENCES;
  }
}

/**
 * Whether a checkpoint is offered on reaching this level.
 *
 * Checkpoints only. A JLPT milestone is not asked of this function, because it
 * is not the member's to decline - `kanjiLadderMilestones()` decides those and
 * they happen at 10, 20, 35, 50 and 100 whatever is set here.
 */
export function checkpointDueAt(level: number, preferences: StudyPreferences): boolean {
  if (preferences.testInterval === 0) return false;
  return level > 0 && level % preferences.testInterval === 0;
}

/** Whether lessons should be held for this member, folding their choice into the site's. */
export function throttleAppliesTo(preferences: StudyPreferences, siteThrottleOn: boolean): boolean {
  if (preferences.throttleLessons === "on") return true;
  if (preferences.throttleLessons === "off") return false;
  return siteThrottleOn;
}

/**
 * Reviews in the order this member asked for.
 *
 * Pure and order-only: it never drops an item, so no choice here can shorten
 * somebody's queue. A test asserts the returned set is always the same set.
 */
export function orderReviews<T extends { availableAt: Date | null; srsStage: number }>(
  items: readonly T[],
  order: StudyReviewOrder,
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  if (order === STUDY_REVIEW_ORDERS.lowestStage) {
    return copy.sort((a, b) => a.srsStage - b.srsStage);
  }
  if (order === STUDY_REVIEW_ORDERS.shuffled) {
    for (let at = copy.length - 1; at > 0; at -= 1) {
      const swap = Math.floor(random() * (at + 1));
      [copy[at], copy[swap]] = [copy[swap], copy[at]];
    }
    return copy;
  }
  /* Most overdue first: the oldest due date leads. A null availableAt is not
     due at all and sorts last rather than being treated as infinitely old. */
  return copy.sort((a, b) => {
    if (a.availableAt === null) return 1;
    if (b.availableAt === null) return -1;
    return a.availableAt.getTime() - b.availableAt.getTime();
  });
}
