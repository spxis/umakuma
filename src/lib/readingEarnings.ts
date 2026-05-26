import {
  getTodayDateInputValue,
  type ReadingSignoffRecord,
} from "@/lib/readingSignoff";
import {
  getChallengeDailyEarningsForecast,
  type ReadingDailyEarningsForecast,
} from "@/lib/readingChallengeEngine";
import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";

export function getReadingDailyEarningsForecast(input: {
  accountId: string;
  signoffs: ReadingSignoffRecord[];
  todayDateKey?: string;
}): ReadingDailyEarningsForecast {
  const todayDateKey = input.todayDateKey ?? getTodayDateInputValue();
  return getChallengeDailyEarningsForecast({
    challenge: ACTIVE_READING_CHALLENGE,
    accountId: input.accountId,
    signoffs: input.signoffs,
    todayDateKey,
  });
}
