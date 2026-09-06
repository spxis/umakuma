/**
 * Which week a day belongs to, and where that week starts and ends.
 *
 * SPX headed its weekly board "Week 23 of 2003", which is the ISO week number,
 * and it is the right label: a member can say which week they mean without a
 * date range, and two members in different weeks are obviously in different
 * weeks.
 *
 * Days are `dayKey` strings - `YYYY-MM-DD` in Vancouver time, the same key
 * `XpEvent` is written with - and every function here works on those rather
 * than on `Date`. A week boundary computed from a timestamp would land in the
 * wrong week for anybody east of us on a Sunday evening, and the whole point of
 * `dayKey` is that the site already decided when a day turns over.
 */

export type XpWeek = {
  /** The ISO week-numbering year, which is not always the calendar year. */
  year: number;
  /** 1-53. */
  week: number;
  /** Monday, as a dayKey. */
  startDayKey: string;
  /** Sunday, as a dayKey. */
  endDayKey: string;
};

function toUtc(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Monday of the week a day falls in. ISO weeks start on Monday. */
function mondayOf(date: Date): Date {
  /* getUTCDay is 0 for Sunday, so Sunday is six days after its Monday. */
  const weekday = (date.getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

/**
 * The ISO week number, by the standard's own definition: the week containing
 * the year's first Thursday is week 1. Computed from the Thursday of this
 * week, which is what makes the year-boundary cases fall out rather than need
 * special-casing - the 1st of January can belong to week 52 of the year before.
 */
export function xpWeekOf(dayKey: string): XpWeek {
  const monday = mondayOf(toUtc(dayKey));
  const thursday = addDays(monday, 3);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return {
    year: thursday.getUTCFullYear(),
    week,
    startDayKey: toDayKey(monday),
    endDayKey: toDayKey(addDays(monday, 6)),
  };
}

/** The week `offset` weeks before the one `dayKey` falls in. */
export function xpWeekBefore(dayKey: string, offset: number): XpWeek {
  const monday = mondayOf(toUtc(dayKey));
  return xpWeekOf(toDayKey(addDays(monday, -7 * offset)));
}
