import {
  READING_CAMPAIGN,
  getTodayDateInputValue,
  parseDateKeyAsUtc,
  toDateKeyUtc,
  type ReadingSignoffRecord,
} from "@/lib/readingSignoff";

export type ReadingDailyEarningsForecast = {
  weekIndex: number;
  weekCapYen: number;
  streakInWeek: number;
  todayMaxNormalYen: number;
  todayMinimumNormalYen: number;
  nextDayMaxNormalYenIfPerfectToday: number;
  nextDayMaxNormalYenIfMissToday: number;
};

function weekIndexFromDate(date: Date): number {
  const startDate = parseDateKeyAsUtc(READING_CAMPAIGN.startDatePst);
  return Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function dayMultiplierFromStreak(streakBeforeToday: number): number {
  return Math.min(1 + 0.1 * streakBeforeToday, 1.6);
}

function isPerfectDay(record: ReadingSignoffRecord | null): boolean {
  if (!record) {
    return false;
  }

  return (record.pagesRead >= 15 || record.minutesRead >= 15) && record.didWanikaniReviews;
}

export function getReadingDailyEarningsForecast(input: {
  accountId: string;
  signoffs: ReadingSignoffRecord[];
  todayDateKey?: string;
}): ReadingDailyEarningsForecast {
  const todayDateKey = input.todayDateKey ?? getTodayDateInputValue();
  if (todayDateKey < READING_CAMPAIGN.startDatePst || todayDateKey > READING_CAMPAIGN.goalDatePst) {
    return {
      weekIndex: -1,
      weekCapYen: 0,
      streakInWeek: 0,
      todayMaxNormalYen: 0,
      todayMinimumNormalYen: 0,
      nextDayMaxNormalYenIfPerfectToday: 0,
      nextDayMaxNormalYenIfMissToday: 0,
    };
  }

  const byDate = new Map<string, ReadingSignoffRecord>();
  for (const signoff of input.signoffs) {
    if (signoff.accountId === input.accountId) {
      byDate.set(signoff.signoffDatePst, signoff);
    }
  }

  const today = parseDateKeyAsUtc(todayDateKey);
  const currentWeekIndex = weekIndexFromDate(today);
  const currentWeekCap = READING_CAMPAIGN.weeklyCaps[currentWeekIndex] ?? 0;
  const weekStart = new Date(parseDateKeyAsUtc(READING_CAMPAIGN.startDatePst));
  weekStart.setUTCDate(weekStart.getUTCDate() + currentWeekIndex * 7);

  let streakInWeek = 0;
  for (const cursor = new Date(weekStart); cursor < today; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!isPerfectDay(byDate.get(toDateKeyUtc(cursor)) ?? null)) {
      streakInWeek = 0;
      continue;
    }

    streakInWeek += 1;
  }

  const todayMaxNormalYen = Math.round(
    currentWeekCap * (dayMultiplierFromStreak(streakInWeek) / READING_CAMPAIGN.weeklyPerfectScore),
  );
  const todayMinimumNormalYen = Math.round(currentWeekCap * (0.5 / READING_CAMPAIGN.weeklyPerfectScore));

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowKey = toDateKeyUtc(tomorrow);
  const tomorrowWeekIndex = weekIndexFromDate(tomorrow);
  const tomorrowWeekCap = READING_CAMPAIGN.weeklyCaps[tomorrowWeekIndex] ?? 0;

  let nextDayMaxNormalYenIfPerfectToday = 0;
  let nextDayMaxNormalYenIfMissToday = 0;

  if (tomorrowKey >= READING_CAMPAIGN.startDatePst && tomorrowKey <= READING_CAMPAIGN.goalDatePst) {
    const sameWeek = tomorrowWeekIndex === currentWeekIndex;
    const nextStreakAfterPerfectToday = sameWeek ? streakInWeek + 1 : 0;
    nextDayMaxNormalYenIfPerfectToday = Math.round(
      tomorrowWeekCap * (dayMultiplierFromStreak(nextStreakAfterPerfectToday) / READING_CAMPAIGN.weeklyPerfectScore),
    );
    nextDayMaxNormalYenIfMissToday = Math.round(
      tomorrowWeekCap * (dayMultiplierFromStreak(0) / READING_CAMPAIGN.weeklyPerfectScore),
    );
  }

  return {
    weekIndex: currentWeekIndex,
    weekCapYen: currentWeekCap,
    streakInWeek,
    todayMaxNormalYen,
    todayMinimumNormalYen,
    nextDayMaxNormalYenIfPerfectToday,
    nextDayMaxNormalYenIfMissToday,
  };
}
