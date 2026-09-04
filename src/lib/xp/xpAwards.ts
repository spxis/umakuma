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
 * economy, not a second economy — see `learnerPacing.ts`, which models the
 * rate each of these actually fires at and holds the steady learner to the
 * three years the curve was built for.
 *
 * Every value is a multiple of five, the same rule the rank costs follow.
 */
export const XP_BONUSES = {
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
  gameFinished: XP_AWARDS.gameFinished * 2,
  lessonLearned: XP_AWARDS.lessonLearned * 30,
  /* Five units, which a clean batch of twenty-two fills on its own. */
  cleanSession: XP_BONUSES.cleanSession * 5,
  /* Two items. A member in the middle of the curriculum burns roughly as many
     items a day as they start, so this one is a ceiling in practice rather
     than in theory - which is the point of it. */
  burnedItem: XP_BONUSES.burnedItem * 2,
};

/**
 * Awards that may be earned once per period rather than repeatedly.
 *
 * The milestones are here as insurance rather than as policy: their triggers
 * already fire once, and a re-derived level or a replayed request should not
 * be able to pay a member twice for the same crossing.
 */
export const XP_ONCE_PER_DAY: XpAwardKind[] = [
  "dailySignIn",
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
} as const;

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
  dailySignIn: "For showing up at all, once a day.",
  reviewAnswered: "For every review you answer, right or wrong \u2014 attempting it is the habit.",
  reviewCorrect: "On top of answering, for getting it right.",
  lessonLearned: "For each new item you start as a lesson.",
  gameFinished: "For finishing a game, up to two a day.",
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
  n5Complete: "For reaching the ladder level that finishes every N5 kanji.",
  n4Complete: "For reaching the ladder level that finishes every N4 kanji.",
  n3Complete: "For reaching the ladder level that finishes every N3 kanji.",
  n2Complete: "For reaching the ladder level that finishes every N2 kanji.",
  n1Complete: "For reaching the ladder level that finishes every N1 kanji, and with it the whole of joyo.",
} satisfies Record<XpAwardKind, string>;
