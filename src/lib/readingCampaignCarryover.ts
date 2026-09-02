import type { ReadingChallengeScoringRules } from "./readingChallengeRules";

/**
 * What a new campaign inherits from the one before it.
 *
 * A campaign is a window of days, a set of weekly caps, and the people and
 * books inside it. When the July one was made, the books the girls were
 * reading and the adults' opt-outs were copied across in the same minute, by
 * hand. This is that practice as maths, so the next campaign is made the same
 * way rather than a slightly different way.
 *
 * Pure, so it can be tested without a database.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

/**
 * How many weekly buckets a window needs.
 *
 * The engine puts a day in week `floor(daysSinceStart / 7)`, so the last day
 * of the window decides the count: a window of 97 days reaches index 13 and
 * needs fourteen caps, or its final week scores against nothing.
 */
export function weeksInWindow(startDatePst: string, goalDatePst: string): number {
  const days = Math.floor((parseDateKey(goalDatePst) - parseDateKey(startDatePst)) / DAY_MS);
  if (days < 0) throw new Error("Goal date is before the start date.");
  return Math.floor(days / 7) + 1;
}

/**
 * The previous campaign's rules, sized to a new window.
 *
 * Everything but the two weekly arrays carries over unchanged: thresholds,
 * bonuses, the streak. The weekly caps are held flat at the previous
 * campaign's final week - the rate the readers are already on - for as many
 * weeks as the window needs. Ramping it further would be a spending decision
 * nobody made; that belongs in the admin editor, one field at a time.
 */
export function rulesForWindow(
  previous: ReadingChallengeScoringRules,
  weeks: number,
): ReadingChallengeScoringRules {
  if (weeks < 1 || weeks > 24) throw new Error("A campaign holds between 1 and 24 weeks.");
  const lastCap = previous.weeklyCaps.at(-1);
  const lastBonusCap = previous.bonuses.weeklyCapYen.at(-1);
  if (lastCap === undefined || lastBonusCap === undefined) throw new Error("The previous campaign has no weekly caps.");

  return {
    ...previous,
    weeklyCaps: Array.from({ length: weeks }, () => lastCap),
    bonuses: {
      ...previous.bonuses,
      weeklyCapYen: Array.from({ length: weeks }, () => lastBonusCap),
    },
  };
}

/** Caps are written in tens of yen; a cap of 2,857.14 is not a number anyone can explain. */
const CAP_STEP_YEN = 10;

/**
 * The previous campaign's rules, sized to a window *and* to a target someone
 * has decided.
 *
 * The base caps are the target spread flat across the weeks, in tens of yen,
 * with whatever the rounding leaves over paid in the final week, so the caps
 * add up to the target exactly and a reader who is perfect every day reaches
 * it on the goal date and not before. The bonus caps keep the previous
 * campaign's proportion of bonus to base - what a great week was worth over
 * a good one stays the same, only the scale changes. Everything else carries
 * over unchanged.
 */
export function rulesForTarget(
  previous: ReadingChallengeScoringRules,
  weeks: number,
  targetBaseYen: number,
): ReadingChallengeScoringRules {
  if (!Number.isInteger(targetBaseYen) || targetBaseYen < weeks * CAP_STEP_YEN) {
    throw new Error(`A target of ¥${targetBaseYen} cannot be spread across ${weeks} weeks.`);
  }
  const flat = rulesForWindow(previous, weeks);
  const previousCap = previous.weeklyCaps.at(-1)!;
  const previousBonusCap = previous.bonuses.weeklyCapYen.at(-1)!;
  const bonusRatio = previousCap > 0 ? previousBonusCap / previousCap : 0;

  const weekCap = Math.floor(targetBaseYen / weeks / CAP_STEP_YEN) * CAP_STEP_YEN;
  const weeklyCaps = Array.from({ length: weeks }, () => weekCap);
  weeklyCaps[weeks - 1] = targetBaseYen - weekCap * (weeks - 1);

  return {
    ...flat,
    weeklyCaps,
    bonuses: {
      ...flat.bonuses,
      weeklyCapYen: weeklyCaps.map((cap) => Math.round((cap * bonusRatio) / CAP_STEP_YEN) * CAP_STEP_YEN),
    },
  };
}

/** The base target the caps add up to, rounded up to the nearest thousand yen. */
export function targetForRules(rules: ReadingChallengeScoringRules): number {
  const total = rules.weeklyCaps.reduce((sum, cap) => sum + cap, 0);
  return Math.ceil(total / 1000) * 1000;
}

export type CarryMember = { accountId: string; tracked: boolean };
export type CarryBook = {
  accountId: string;
  isbn: string;
  title: string;
  thumbnailUrl: string | null;
  manualCoverUrl: string | null;
  infoUrl: string | null;
};

/**
 * What to copy into the new campaign.
 *
 * Members: every row, tracked or not, so an adult who opted out of the
 * leaderboard stays out. Books: one per reader per ISBN, so a book that was
 * copied twice by an earlier hand is not copied three times by this one.
 */
export function carryOverPlan(members: CarryMember[], books: CarryBook[]): { members: CarryMember[]; books: CarryBook[] } {
  const seenMembers = new Set<string>();
  const seenBooks = new Set<string>();
  return {
    members: members.filter((member) => {
      if (seenMembers.has(member.accountId)) return false;
      seenMembers.add(member.accountId);
      return true;
    }),
    books: books.filter((book) => {
      const key = `${book.accountId}:${book.isbn}`;
      if (seenBooks.has(key)) return false;
      seenBooks.add(key);
      return true;
    }),
  };
}
