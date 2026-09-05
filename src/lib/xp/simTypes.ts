import type { SubjectType } from "@/lib/domainConstants";

/**
 * What the balance simulator takes in and what it hands back.
 *
 * Here rather than in the engine because three things read them — the engine,
 * the persona set and the admin route — and a type block in the middle of a
 * simulation loop is the first thing to go stale.
 */

export type SimPersona = {
  id: string;
  label: string;
  /** Why this person exists, in a sentence you can argue with. */
  story: string;
  /** Chance of studying on any given day, 0-1. */
  attendance: number;
  /** Reviews they are willing to answer on a day they study. */
  reviewsPerDay: number;
  /** New items started on a day they study. */
  lessonsPerDay: number;
  gamesPerDay: number;
  /** Share answered correctly. Drives both ladders, hard. */
  accuracy: number;
  /**
   * The hours of the day they sit down, 0-23.
   *
   * Stage 1 comes back in four hours and stage 2 in eight, so a second sitting
   * can catch an item the same day where a single sitting cannot. Stages three
   * and four wait 23 and 47 hours, which no number of sittings compresses —
   * that ceiling is the answer to how much sitting twice a day is worth, and
   * it is a property of the schedule rather than of the model.
   */
  sessionHours: number[];
  /** Whether they sit a level test when one is offered. */
  sitsExams: boolean;
  /** A single unbroken absence in the year, in days. */
  holidayDays: number;
  /**
   * Where they start on the curriculum ladder.
   *
   * One for everybody who begins here. A WaniKani import lands somebody part
   * way up with the levels below already behind them, which is the case the
   * import-XP question is about.
   */
  startLevel: number;
  /** XP they arrive holding. Zero for everybody who earned their way in. */
  startXp: number;
};

/** A persona field an admin may move for one run without editing the set. */
export type SimOverrides = Partial<
  Pick<
    SimPersona,
    | "attendance"
    | "reviewsPerDay"
    | "lessonsPerDay"
    | "gamesPerDay"
    | "accuracy"
    | "sessionHours"
    | "sitsExams"
    | "holidayDays"
    | "startLevel"
    | "startXp"
  >
>;

export type SimOptions = {
  days?: number;
  seed?: number;
  /**
   * Hold lessons when the apprentice queue is already this deep.
   *
   * Off by default, because the unlimited case is the one that shows the
   * problem: a lesson rate the review budget cannot service is a promise the
   * learner cannot keep, and the backlog it produces is a finding rather than
   * a thing to hide. Turning it on is how you test the fix.
   */
  lessonGate?: number | null;
  /**
   * Take no lessons on a day that already opens behind on reviews.
   *
   * Anki's default and the highest-leverage load control of any system
   * surveyed: new cards come out of the same daily limit as reviews there, so
   * introduction pauses by itself while you are catching up. WaniKani has no
   * equivalent and neither do we. This is the switch that says what it would
   * be worth.
   */
  throttleLessonsOnBacklog?: boolean;
};

export type SimXpSplit = {
  reviews: number;
  lessons: number;
  games: number;
  levels: number;
  streaks: number;
  /** Clean batches and burns: what doing it *well* pays. */
  quality: number;
};

export type SimResult = {
  persona: SimPersona;
  days: number;
  daysStudied: number;
  reviewsAnswered: number;
  wrongAnswers: number;
  /** Share of all answers that were wrong. */
  wrongShare: number;
  lessonsStarted: number;
  gamesPlayed: number;
  xp: number;
  xpRank: number;
  rankName: string;
  xpSplit: SimXpSplit;
  curriculumLevel: number;
  itemsLearned: number;
  /** Items that have ever reached Guru. The level gate's own high-water mark. */
  itemsPassed: number;
  itemsBurned: number;
  /** Items started and not yet burned: the queue they are carrying. */
  itemsInFlight: number;
  /**
   * Items that were due and never got answered, at the end of the last day.
   *
   * The stall indicator. A backlog that grows every month is somebody doing
   * everything asked of them and falling further behind while they do it.
   */
  backlog: number;
  /**
   * Reviews a day this lesson rate eventually demands, against what they do.
   *
   * Above one and the queue must diverge — not because they are slow, but
   * because every new item carries a lifetime of reviews behind it and they
   * are starting more lifetimes a day than they can service.
   */
  reviewLoadRatio: number;
  longestStreak: number;
  restDaysSpent: number;
  restDaysAllowed: number;
  /** True when the streak came through the holiday intact. */
  streakSurvivedHoliday: boolean;
  examsSat: number;
  /**
   * The day each ladder level was first reached, indexed by level.
   *
   * Null where the horizon ended first. This is what the retired closed-form
   * model was for — "how long does this take" — answered by the run rather
   * than by dividing work by rate, so the feedback loops are in the answer.
   */
  levelDays: (number | null)[];
  /**
   * XP held on the day each level was first reached, indexed by level.
   *
   * The import question's evidence: what somebody who earned level 20 here
   * had banked by the time they got there, which is what a level-scaled
   * import award would be handing over.
   */
  levelXp: (number | null)[];
  dayReachedRank100: number | null;
};

/** One item in the pool, kept until it burns. */
export type SimItem = {
  stage: number;
  kind: SubjectType;
  level: number;
  /** True once it has ever reached Guru. The gate never takes that back. */
  passed: boolean;
};
