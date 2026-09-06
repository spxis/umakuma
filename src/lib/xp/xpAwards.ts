/**
 * What earns XP, and what it is capped at.
 *
 * XP rewards the habit; the curriculum ladder rewards the knowledge. Keeping
 * them apart is the point — neither can be bought with the other, so a member
 * cannot grind their way to looking knowledgeable, and a member who already
 * knows a lot of Japanese still has to turn up to climb this one.
 *
 * Caps exist because the alternative is a ladder that rewards sitting at a
 * screen rather than studying. A day of fifty reviews and a game earns most of
 * what a day of five hundred reviews would.
 */

export const XP_AWARDS = {
  /** Once a Vancouver day, for showing up at all. */
  dailySignIn: 10,
  /** Every answer, right or wrong: attempting is the habit. */
  reviewAnswered: 1,
  /** On top, for getting it right. */
  reviewCorrect: 1,
  lessonLearned: 3,
  gameFinished: 5,
  levelTestWritten: 25,
  levelTestPassed: 50,
  /** A curriculum level. The one place the two ladders touch. */
  curriculumLevelGained: 100,
  weeklyStreak: 50,
} as const;

/**
 * Bonuses: what a member earns for doing it *well*, or for keeping at it.
 *
 * Held apart from `XP_AWARDS` rather than mixed in, because the two answer
 * different questions. The routine map is the economy — what a day of study is
 * worth — and it has to be readable on its own, without the exceptional stuff
 * sitting on top of it. A reader who cannot see the routine economy cannot
 * tell whether it is fair.
 *
 * **The caps do most of the work here.** Three of these fire far more often
 * than they look like they would: a member who starts ten lessons a day burns
 * ten items a day once the schedule catches up, six months later, and a clean
 * batch of ten happens about one sitting in five at ordinary accuracy. Priced
 * per event with no ceiling, burning alone would have been worth more than the
 * whole routine day it sits beside. So a bonus is a garnish on the routine
 * economy, not a second economy — `balanceSimulator.ts` fires each of these at
 * the rate the schedule actually produces it, caps included, and holds the
 * reference learner to the three years the curve was built for.
 *
 * Every value is a multiple of five, the same rule the rank costs follow.
 */
export const XP_BONUSES = {
  /**
   * For arriving with knowledge from somewhere else - a placement test
   * passed, or WaniKani progress carried across. Paid once, ever, and never
   * scaled by the level reached.
   *
   * The simulator settled the amount. A member who earns level 20 here has
   * banked about 36,000 XP over 285 days; paying an importer for the level
   * would seat them above somebody who attended daily for most of a year.
   * But the zero start costs almost nothing - importer and from-scratch
   * learner doing the identical day are within three ranks of each other at
   * a month - so the award is for the act of placing, not the height. 250 is
   * rank 5, which is exactly where vacation unlocks: enough that somebody
   * carrying a level-20 queue is not on a beginner's allowances.
   */
  placementAward: 250,
  /** Seven days in a row. The first one that takes a bit of holding. */
  sevenDayStreak: 50,
  thirtyDayStreak: 150,
  hundredDayStreak: 400,
  /** A year without missing a day. It repeats, so it is worth repeating for. */
  yearLongStreak: 1500,
  /**
   * One unit of a review batch answered with nothing wrong.
   *
   * Paid per unit rather than per session, so the size of the batch decides
   * what it is worth - see `cleanSessionUnits`. A flat per-session bonus is an
   * invitation to review one item at a time.
   */
  cleanSession: 5,
  /** Stage 9: the end of an item's journey. */
  burnedItem: 5,

  /* --- The daily quests. Two or three of these are put in front of a member
     each day by `xpQuests.ts`, chosen to suit the size of their ordinary day,
     and each pays once, on the day it is finished.

     They arrived here out of `xpProposedAwards.ts`, which is where a kind
     waits until something fires it: that module's rule is that these two maps
     are the awards the site actually gives, so wiring a kind means moving it
     rather than reaching across.

     **Every one was repriced downward on the way over.** The proposed numbers
     (25, 50, 50, 100) were written for kinds that fire now and again; a quest
     fires most days a member studies, and three of them at those prices would
     have put about 90 XP on top of a steady learner's 166 XP day. That is not
     a garnish, it is a second economy - the exact thing the note above this
     map says a bonus must never become. At 10, 15, 20 and 40 a full day of
     quests is worth about a fifth of the day it garnishes, the same order as
     the sign-in and the day's games together. */

  /** A lesson and a game in one day. The one every member can reach. */
  wellRoundedDay: 10,
  /** The review queue taken to zero. Scales its own difficulty. */
  queueCleared: 15,
  /** Fifty reviews answered in a day. */
  fiftyReviewDay: 20,
  /** Twenty reviews or more in a day with nothing wrong in any of them. */
  flawlessDay: 40,

  /* --- The three a finished game can achieve, as opposed to simply having
     happened. They came out of `xpProposedAwards.ts` at John's prices, which
     are his to retune from the admin screen; what is decided here is when each
     one fires and how often it may.

     **They are not gated on the games-per-day allowance.** That allowance caps
     `gameFinished`, which pays for turning up, and turning up is the thing
     worth rationing. Beating your own score is not: it is self-limiting by
     construction, and a member whose third game of the day is their best ever
     should not be told nothing happened. The two that *are* grindable carry a
     daily cap of one instead. */

  /** Every answer right, in a game with enough answers to mean it. */
  flawlessGame: 50,
  /** A score past this account's own best at that game. */
  personalBest: 50,
  /** Every region of a country named correctly, in one game. */
  mapCleared: 200,

  /** A JLPT band completed on the kanji ladder. The big ones. */
  n5Complete: 300,
  n4Complete: 600,
  n3Complete: 1100,
  n2Complete: 1700,
  n1Complete: 2600,
} as const;

/** What a member earns for doing the thing at all. */
export type XpRoutineKind = keyof typeof XP_AWARDS;
/** What a member earns for doing it well, or for keeping at it. */
export type XpBonusKind = keyof typeof XP_BONUSES;
export type XpAwardKind = XpRoutineKind | XpBonusKind;

/* One lookup over both maps, so a caller never has to know which half a kind
   came out of. The two maps stay separate for the reader; the awarding code
   asks one question. */
const XP_VALUES: Record<XpAwardKind, number> = { ...XP_AWARDS, ...XP_BONUSES };

export function isXpBonusKind(kind: XpAwardKind): kind is XpBonusKind {
  return kind in XP_BONUSES;
}

/**
 * How much of a kind may be earned in one day, where a limit applies.
 *
 * A missing entry means no cap: answering reviews is the thing we want, and
 * capping it would mean telling a member their study stopped counting.
 */
export const XP_DAILY_CAPS: Partial<Record<XpAwardKind, number>> = {
  dailySignIn: XP_AWARDS.dailySignIn,
  /* A week is seven days long however many times a day the streak is looked
     at. Capped as well as listed once-a-day - the same belt and braces
     `dailySignIn` wears - because this one is repeatable in shape, and a
     caller that forgot the rule would pay it on every answer. */
  weeklyStreak: XP_AWARDS.weeklyStreak,
  gameFinished: XP_AWARDS.gameFinished * 2,
  lessonLearned: XP_AWARDS.lessonLearned * 30,
  /* Five units, which a clean batch of twenty-two fills on its own. */
  cleanSession: XP_BONUSES.cleanSession * 5,
  /* Once a day each, because both are repeatable at the player's convenience.
     A flawless round of five is a minute's work, and a country of thirteen
     regions can be cleared as often as somebody cares to. Paying either of
     them per game would make the games the best XP on the site by a wide
     margin, which is the one thing the caps in this file exist to prevent.

     `personalBest` is deliberately absent: it cannot be repeated without
     actually being beaten, so the achievement caps itself. */
  flawlessGame: XP_BONUSES.flawlessGame,
  mapCleared: XP_BONUSES.mapCleared,
};

/*
 * Burning is deliberately uncapped.
 *
 * It carried a two-item ceiling on the reasoning that a member in the middle
 * of the curriculum burns about as many items a day as they start, so the cap
 * would rarely bite. John's answer, seeing it priced: "There is no point in
 * having a cap on Burned Items... that is a big achievement and should be
 * rewarded."
 *
 * He is right, and the old reasoning gave itself away - a cap that is supposed
 * never to bite is not protecting the economy, it is only there to punish the
 * day it does. Burning is the one award a member cannot farm: it takes months
 * of correct answers per item and it happens once, ever, for that item.
 */

/**
 * Awards that may be earned once per period rather than repeatedly.
 *
 * The milestones are here as insurance rather than as policy: their triggers
 * already fire once, and a re-derived level or a replayed request should not
 * be able to pay a member twice for the same crossing.
 */
export const XP_ONCE_PER_DAY: XpAwardKind[] = [
  "dailySignIn",
  "weeklyStreak",
  /* The quests, where it is policy rather than insurance: a quest is a
     question about today, and today only has one answer. Finishing the
     fiftieth review twice does not happen, but crossing the line and then
     answering another twenty does, and each of those answers settles the
     day's quests again. */
  "wellRoundedDay",
  "queueCleared",
  "fiftyReviewDay",
  "flawlessDay",
  "sevenDayStreak",
  "thirtyDayStreak",
  "hundredDayStreak",
  "yearLongStreak",
  "n5Complete",
  "n4Complete",
  "n3Complete",
  "n2Complete",
  "n1Complete",
];

/** Consecutive days that earn a milestone, longest last. */
export const XP_STREAK_MILESTONES: readonly { days: number; kind: XpBonusKind }[] = [
  { days: 7, kind: "sevenDayStreak" },
  { days: 30, kind: "thirtyDayStreak" },
  { days: 100, kind: "hundredDayStreak" },
  { days: 365, kind: "yearLongStreak" },
];

/** The milestone a streak of exactly this many days has just reached. */
export function streakMilestoneFor(days: number): XpBonusKind | null {
  return XP_STREAK_MILESTONES.find((milestone) => milestone.days === days)?.kind ?? null;
}

/**
 * The bonus for completing a JLPT band, keyed by its N number.
 *
 * Keyed by the band rather than by the ladder level on purpose: which level
 * completes N4 is the curriculum's business and moves when the ladder is
 * rebuilt, so `kanjiLadder.ts` answers that and this map only prices the
 * result. It also keeps the ladder's data file out of the awards module.
 */
export const XP_JLPT_BONUSES: Record<number, XpBonusKind> = {
  5: "n5Complete",
  4: "n4Complete",
  3: "n3Complete",
  2: "n2Complete",
  1: "n1Complete",
};

export function jlptMilestoneFor(nLevel: number | null | undefined): XpBonusKind | null {
  return nLevel === null || nLevel === undefined ? null : XP_JLPT_BONUSES[nLevel] ?? null;
}

/**
 * What one particular award was for, where the kind's own note is too general.
 *
 * `XpEvent.note` carries these, so a member reading "+1,100 XP" on their
 * history is told which band they finished rather than being told that some
 * band was finished. Kept here with the rest of the XP copy so the locale
 * layer has one file to swap.
 */
export const XP_EVENT_NOTES = {
  jlptComplete: (level: number, nLevel: number) => `Level ${level}, N${nLevel} complete.`,
  streak: (days: number) => `${days} days in a row.`,
  cleanSession: (size: number) => `${size} reviews, none wrong.`,
  flawlessGame: (label: string, count: number) => `${label}: ${count} out of ${count}.`,
  personalBest: (label: string, score: number, beaten: number) =>
    `${label}: ${xpScore(score)}, past your ${xpScore(beaten)}.`,
  mapCleared: (label: string, regions: number) => `${label}: all ${regions}.`,
} as const;

/**
 * A score in a note, grouped the way the site writes numbers everywhere else.
 *
 * The locale is named rather than left to the machine on purpose: this string
 * is written into `XpEvent.note` on a server whose locale is nobody's, and a
 * note that reads `10520` on one deploy and `10,520` on another is a note the
 * history cannot be trusted to keep.
 */
function xpScore(value: number): string {
  return value.toLocaleString("en-CA");
}

/** A batch smaller than this is not a session, and earns nothing for being clean. */
export const XP_CLEAN_SESSION_MIN = 5;

/**
 * How many `cleanSession` units a flawless batch of `size` is worth.
 *
 * Grows faster than the batch does, which is the whole requirement: ten
 * answered without a mistake has to beat two answered without a mistake, or
 * the bonus becomes an instruction to review one item at a time. Below the
 * minimum it pays nothing at all, which closes that door rather than narrowing
 * it - twenty batches of one earn zero, where twenty in one sitting earn four
 * units.
 */
export function cleanSessionUnits(size: number): number {
  if (!Number.isFinite(size) || size < XP_CLEAN_SESSION_MIN) return 0;
  return Math.max(1, Math.floor((size * size) / 100));
}

/**
 * What one day of committed use is worth, which is the number the curve was
 * built against: a sign-in, fifty reviews answered correctly, ten lessons, a
 * game, and a seventh of the weekly streak.
 */
export const XP_COMMITTED_DAY =
  XP_AWARDS.dailySignIn +
  50 * (XP_AWARDS.reviewAnswered + XP_AWARDS.reviewCorrect) +
  10 * XP_AWARDS.lessonLearned +
  XP_AWARDS.gameFinished * 2 +
  Math.round(XP_AWARDS.weeklyStreak / 7);

/** The XP an award is worth, after its daily cap. */
/**
 * @param entitlements What the member's XP rank has unlocked, where it widens
 *   a cap. Omitted, the static caps apply — which is the right answer for
 *   every caller that is not awarding for a game, and keeps this function pure
 *   and free of any notion of who is asking.
 */
export function xpAwardValue(
  kind: XpAwardKind,
  earnedToday: number,
  entitlements?: { gamesPerDay: number },
): number {
  const value = XP_VALUES[kind];
  /* A rank buys capacity, and games are the first thing it buys: the cap is
     the allowance times what one game is worth, so unlocking a fourth game
     raises the ceiling rather than changing what a game pays. */
  const cap =
    kind === "gameFinished" && entitlements
      ? entitlements.gamesPerDay * XP_AWARDS.gameFinished
      : XP_DAILY_CAPS[kind];
  if (cap === undefined) return value;
  return Math.max(0, Math.min(value, cap - earnedToday));
}

/**
 * What each kind is *for*, in a sentence, written for the member reading their
 * own history rather than for whoever wrote the award.
 *
 * `scripts/seed-xp-types.ts` writes these into `XpType`, so the constants stay
 * the single source and the rows stay derived from them. `satisfies` is what
 * makes a new award without a sentence a compile error rather than a blank
 * cell somebody notices in production.
 */
export const XP_TYPE_NOTES: Record<string, string> = {
  placementAward: "For arriving with what you already knew — a placement test passed, or WaniKani progress carried across. Once, ever.",
  dailySignIn: "For showing up at all, once a day.",
  reviewAnswered: "For every review you answer, right or wrong \u2014 attempting it is the habit.",
  reviewCorrect: "On top of answering, for getting it right.",
  lessonLearned: "For each new item you start as a lesson.",
  gameFinished: "For finishing a game. Two a day to begin with, and more as your rank rises.",
  levelTestWritten: "For sitting a level test, however it goes.",
  levelTestPassed: "For passing a level test.",
  curriculumLevelGained: "For reaching a new level on the kanji ladder.",
  weeklyStreak: "For a full week of study without a day off.",
  sevenDayStreak: "For studying seven days in a row.",
  thirtyDayStreak: "For studying thirty days in a row.",
  hundredDayStreak: "For studying a hundred days in a row.",
  yearLongStreak: "For a whole year without missing a day.",
  cleanSession: "For a batch of reviews with nothing wrong in it, worth more the bigger the batch.",
  burnedItem: "For carrying an item all the way to the top stage.",
  flawlessGame: "For a game with every answer right. Once a day.",
  personalBest: "For beating your own best score at a game.",
  mapCleared: "For naming every region of a country on the map, in one game. Once a day.",
  wellRoundedDay: "For a day with both a lesson and a game in it.",
  queueCleared: "For taking your review queue all the way to zero.",
  fiftyReviewDay: "For fifty reviews in a single day.",
  flawlessDay: "For a day of at least twenty reviews with nothing wrong in it.",
  n5Complete: "For reaching the ladder level that finishes every N5 kanji.",
  n4Complete: "For reaching the ladder level that finishes every N4 kanji.",
  n3Complete: "For reaching the ladder level that finishes every N3 kanji.",
  n2Complete: "For reaching the ladder level that finishes every N2 kanji.",
  n1Complete: "For reaching the ladder level that finishes every N1 kanji, and with it the whole of joyo.",
} satisfies Record<XpAwardKind, string>;
