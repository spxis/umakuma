import "server-only";

import {
  resolveInitialSrsFilter,
  resolveInitialStudyFilters,
} from "../userReadConfig";
import { QUEUE_TYPES } from "@/lib/domainConstants";

import { loadLevelProgress } from "./levelProgress";

/**
 * Everything the three explorers take, assembled per route.
 *
 * `withJlpt` is the reason this is a function rather than one loader: the JLPT
 * explorer needs the whole `JlptKanji` table and the member's kanji index from
 * WaniKani, and the other two do not. On the shared page that was decided by a
 * `?tab=` query and loaded for whichever explorer happened to be showing;
 * here it is decided by which route you are on.
 */
export async function loadExplorerPage(
  userKey: string,
  query: Record<string, string | undefined>,
  tab: "study" | "level" | "jlpt",
) {
  const progress = await loadLevelProgress(userKey, { withJlpt: tab === "jlpt" });
  const { account } = progress;
  const wkLevel = account.wkLevel ?? 0;
  const initialStudyFilters = resolveInitialStudyFilters(query);

  return {
    accountId: account.id,
    /*
     * Which of our two ladders this member climbs, carried down rather than
     * re-derived: the explorer prints their standing, and it printed `UN` at
     * everybody - a number from a curriculum a UG member is not taught
     * against, under a prefix saying they are.
     */
    ladderStream: account.ladderStream,
    maxLevel: wkLevel,
    accountPendingReviews: account.pendingReviews,
    levelItemCountsByLevel: progress.levelItemCountsByLevel,
    initialQueueMode:
      query.mode === QUEUE_TYPES.lesson
        ? QUEUE_TYPES.lesson
        : query.mode === QUEUE_TYPES.review
          ? QUEUE_TYPES.review
          : undefined,
    initialStudyMode:
      query.studyMode === "on" || query.studyMode === "1"
        ? true
        : query.studyMode === "off" || query.studyMode === "0"
          ? false
          : null,
    initialStudyFilters: {
      viewedLevel: initialStudyFilters.viewedLevel,
      typeFilter: initialStudyFilters.typeFilter,
      srsFilter: initialStudyFilters.srsFilter,
      srsStageFilter: initialStudyFilters.srsStageFilter,
      recentOnly: initialStudyFilters.recentOnly,
      showLocked: initialStudyFilters.showLocked,
    },
    initialSnapshot: {
      level: wkLevel,
      kanjiTotal: account.levelKanjiTotal,
      kanjiLearned: account.levelKanjiLearned,
      kanjiGuruPlus: account.levelKanjiGuruPlus,
      kanjiLocked: account.levelKanjiLocked,
      estimatedHoursRemaining: account.estimatedHoursRemaining,
      items: progress.levelKanjiItems,
      syncedAt: account.lastSyncedAt.toISOString(),
    },
    initialSrsFilter: resolveInitialSrsFilter(query),
    jlptItems: progress.jlptKanjiRows.map((row) => ({
      kanji: row.kanji,
      nLevel: row.nLevel,
      strokeCount: row.strokeCount,
      frequencyRank: row.frequencyRank,
      schoolGrade: row.schoolGrade,
      heisigKeyword: row.heisigKeyword,
      unicodeHex: row.unicodeHex,
      sourceJlpt: row.sourceJlpt,
      primaryMeaning: row.primaryMeaning,
      meanings: row.meanings,
      onReadings: row.onReadings,
      kunReadings: row.kunReadings,
      nanoriReadings: row.nanoriReadings,
      notes: row.notes,
    })),
    userKanjiItems: progress.userKanjiIndex,
  };
}
