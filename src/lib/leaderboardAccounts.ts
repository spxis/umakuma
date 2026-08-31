import "server-only";

import { listableTo } from "./accountListing";
import type { Viewer } from "./accountVisibility";
import { prisma } from "./prisma";
import { onlyConnected } from "./wanikaniConnection";

/**
 * The rows the leaderboard ranks, for one viewer.
 *
 * Two filters answering different questions, and both belong here rather than
 * at the call site. `listableTo` decides who may be seen at all - the member's
 * own visibility choice and the admin's approval - and `onlyConnected` decides
 * who this particular board can rank, since it ranks WaniKani numbers and an
 * account without a connection has none.
 *
 * Filtering after the query rather than in the `where` keeps the rule in one
 * tested place: a `where` clause would have to restate "null counts as
 * visible" for accounts that predate the column, and getting that subtly wrong
 * silently removes people from the board.
 */
export async function loadLeaderboardAccounts(viewer: Viewer) {
  const accounts = await prisma.account.findMany({
    orderBy: [{ score: "desc" }, { wkLevel: "desc" }, { reviewCount: "desc" }],
    select: {
      id: true,
      nickname: true,
      wkUsername: true,
      wkLevel: true,
      visibility: true,
      approvalStatus: true,
      reviewCount: true,
      burnedCount: true,
      pendingReviews: true,
      radicalCount: true,
      vocabularyCount: true,
      apprenticeCount: true,
      guruCount: true,
      masterCount: true,
      enlightenedCount: true,
      levelKanjiTotal: true,
      levelKanjiLearned: true,
      levelKanjiGuruPlus: true,
      levelKanjiLocked: true,
      itemSpread: true,
      jlptCounts: true,
      lastActivityAt: true,
      lastRadicalGuruedAt: true,
      lastKanjiGuruedAt: true,
      lastVocabularyGuruedAt: true,
      lastRadicalGuruedItem: true,
      lastKanjiGuruedItem: true,
      lastVocabularyGuruedItem: true,
      score: true,
      lastSyncedAt: true,
    },
  });

  return onlyConnected(listableTo(accounts, viewer));
}
