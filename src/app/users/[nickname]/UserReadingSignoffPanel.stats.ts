import type {
  ReadingSignoffEntryRecord,
  ReadingSignoffRecord,
} from "@/lib/readingSignoff";

import type { Member, TodayStats } from "./UserReadingSignoffPanel.types";

type BuildTodayStatsArgs = {
  trackedMembers: Member[];
  signoffByDayAndMember: Map<string, Map<string, ReadingSignoffRecord>>;
  signoffEntriesByDayAndMember: Map<string, Map<string, ReadingSignoffEntryRecord[]>>;
  today: string;
};

export function buildTodayStatsByAccountId({
  trackedMembers,
  signoffByDayAndMember,
  signoffEntriesByDayAndMember,
  today,
}: BuildTodayStatsArgs): Map<string, TodayStats> {
  const map = new Map<string, TodayStats>();
  const byMember = signoffByDayAndMember.get(today) ?? new Map<string, ReadingSignoffRecord>();
  const byMemberEntries = signoffEntriesByDayAndMember.get(today) ?? new Map<string, ReadingSignoffEntryRecord[]>();

  for (const member of trackedMembers) {
    const daySignoff = byMember.get(member.id);
    const entries = byMemberEntries.get(member.id) ?? [];
    const reviewKanji = entries.reduce((sum, entry) => sum + entry.reviewCorrect, 0);
    const reviewVocabulary = entries.reduce((sum, entry) => sum + entry.reviewIncorrect, 0);
    const reviewRadical = entries.reduce((sum, entry) => sum + (entry.reviewSuccessPercent ?? 0), 0);
    const reviewTotal = entries.reduce((sum, entry) => sum + entry.reviewWorkDone, 0);
    const fallbackTotal = daySignoff?.reviewsLeft ?? 0;
    const effectiveTotal = reviewTotal > 0 || entries.length > 0 ? reviewTotal : fallbackTotal;

    map.set(member.id, {
      pagesRead: daySignoff?.pagesRead ?? 0,
      minutesRead: daySignoff?.minutesRead ?? 0,
      reviewKanji,
      reviewVocabulary,
      reviewRadical,
      reviewTotal: effectiveTotal,
      zeroReviewsBonus: Boolean(daySignoff?.didWanikaniReviews && effectiveTotal === 0),
    });
  }

  return map;
}
