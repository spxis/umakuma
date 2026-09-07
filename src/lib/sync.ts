import "server-only";

import { wanikaniConnection } from "@/lib/wanikaniConnection";
import { upsertDailySnapshot } from "@/lib/dailySnapshot";
import type { Prisma } from "@prisma/client";
import { rankingWeights } from "@/lib/ladder/rankingWeightsServer";
import { prisma } from "@/lib/prisma";
import { LEADERBOARD_REFRESH_INTERVAL_MS } from "@/lib/refreshPolicy";
import { getLeaderboardStats } from "@/lib/wanikani";

const SYNC_LOCK_MS = 5 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 30 * 60 * 1000;
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;

type SyncResult = {
  refreshed: boolean;
  reason?: string;
};

type RefreshBatchResult = {
  refreshed: number;
  skipped: number;
};

function nowPlus(ms: number): Date {
  return new Date(Date.now() + ms);
}

/** Hands back a claim without pretending a sync happened. */
async function releaseClaim(accountId: string, status: string): Promise<void> {
  await prisma.account.update({
    where: { id: accountId },
    data: { isSyncing: false, syncLockUntil: null, lastSyncStatus: status },
  });
}

/**
 * Every claim that can no longer be doing anything, released.
 *
 * A claim with no lock on it is the one this used to miss: it asked for locks
 * that had expired, and a row marked syncing with `syncLockUntil` null has
 * nothing to expire, so it stayed syncing for ever. That is how Johnny came
 * to have been "syncing" since 2026-09-02.
 */
export async function clearExpiredSyncLocks(now: Date = new Date()): Promise<void> {
  await prisma.account.updateMany({
    where: {
      isSyncing: true,
      OR: [{ syncLockUntil: { lt: now } }, { syncLockUntil: null }],
    },
    data: {
      isSyncing: false,
      syncLockUntil: null,
      lastSyncStatus: "idle",
    },
  });
}

/**
 * Who the sweep may pick, and it is only ever somebody with a connection.
 *
 * **An account with no token can never be refreshed, so it must never be in
 * the queue.** It was, and it starved every real one: the sweep takes the two
 * oldest `lastSyncedAt` and a disconnected account fails before that column is
 * written, so it stays the oldest for ever and is picked again on the next
 * call, and the one after. Two tokenless accounts sat at the head from
 * 2026-09-02 and every connected member - John included - stopped syncing on
 * 2026-09-05, which is what he found in his history: "my reviews are not
 * showing up in my History!!!"
 *
 * Exported so the rule is a thing that can be tested rather than a clause
 * buried in a query, because the failure it prevents is invisible: nothing
 * errors, nothing logs, the sweep reports two accounts refreshed - it just
 * refreshes the same two nothings for ever.
 */
export function syncQueueWhere(now: Date, staleBefore: Date): Prisma.AccountWhereInput {
  return {
    /*
     * No connection, nothing to pull, never in the queue.
     *
     * All three parts, because that is what a connection is: `wanikaniConnection`
     * refuses a half-connected account, and asking for only the ciphertext here
     * would leave one with a null iv or tag failing at exactly the same point -
     * and it would keep its place at the head of the queue, which is the whole
     * bug this clause exists to prevent.
     */
    tokenEncrypted: { not: null },
    tokenIv: { not: null },
    tokenTag: { not: null },
    AND: [
      { lastSyncedAt: { lt: staleBefore } },
      { nextSyncAllowedAt: { lte: now } },
      {
        OR: [{ isSyncing: false }, { syncLockUntil: { lt: now } }, { syncLockUntil: null }],
      },
    ],
  };
}

export async function refreshDueAccounts(maxAccounts = 2): Promise<RefreshBatchResult> {
  const now = new Date();
  await clearExpiredSyncLocks(now);
  const staleBefore = new Date(Date.now() - LEADERBOARD_REFRESH_INTERVAL_MS);

  const due = await prisma.account.findMany({
    where: syncQueueWhere(now, staleBefore),
    orderBy: { lastSyncedAt: "asc" },
    select: { id: true },
    take: maxAccounts,
  });

  let refreshed = 0;

  for (let index = 0; index < due.length; index += 1) {
    const account = due[index];
    const result = await refreshAccountById(account.id, false);
    if (result.refreshed) {
      refreshed += 1;
    }
  }

  return {
    refreshed,
    skipped: due.length - refreshed,
  };
}

export async function refreshAccountById(accountId: string, force: boolean, ignoreManualCooldown = false): Promise<SyncResult> {
  const now = new Date();
  await clearExpiredSyncLocks(now);
  const staleBefore = new Date(Date.now() - LEADERBOARD_REFRESH_INTERVAL_MS);
  const manualThreshold = new Date(Date.now() - MANUAL_REFRESH_COOLDOWN_MS);

  const claim = await prisma.account.updateMany({
    where: {
      id: accountId,
      ...(force
        ? (ignoreManualCooldown ? {} : { lastSyncedAt: { lt: manualThreshold } })
        : {
            AND: [{ nextSyncAllowedAt: { lte: now } }, { lastSyncedAt: { lt: staleBefore } }],
          }),
      OR: [{ isSyncing: false }, { syncLockUntil: { lt: now } }, { syncLockUntil: null }],
    },
    data: {
      isSyncing: true,
      syncLockUntil: nowPlus(SYNC_LOCK_MS),
      lastSyncStatus: "syncing",
      lastSyncError: null,
    },
  });

  if (claim.count === 0) {
    return {
      refreshed: false,
      reason: force ? "manual-cooldown-1m" : "not-due-or-busy",
    };
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      tokenEncrypted: true,
      tokenIv: true,
      tokenTag: true,
      wkUserId: true,
      wkUsername: true,
      wkLevel: true,
      reviewCount: true,
      burnedCount: true,
      reviewsUpdatedAt: true,
      lastRadicalGuruedAt: true,
      lastKanjiGuruedAt: true,
      lastVocabularyGuruedAt: true,
      lastRadicalGuruedItem: true,
      lastKanjiGuruedItem: true,
      lastVocabularyGuruedItem: true,
      assignmentCache: true,
      assignmentCacheUpdatedAt: true,
      wkHttpCache: true,
    },
  });

  if (!account) {
    return { refreshed: false, reason: "missing" };
  }

  /*
   * Syncing pulls the player's own WaniKani state. An account with no
   * connection has none to pull, so this is a nothing-to-do rather than a
   * failure - the caller sweeps every account and should not log an error for
   * each unconnected one.
   */
  const connection = wanikaniConnection(account);
  if (!connection) {
    /*
     * Put the claim down before leaving.
     *
     * The claim above marks the account syncing and locks it for five
     * minutes; returning through here left it that way, so a disconnected
     * account read as "syncing" for days - Johnny had been syncing since
     * 2026-09-02. Nothing to do is not nothing to undo.
     */
    await releaseClaim(accountId, "idle");
    return { refreshed: false, reason: "disconnected" };
  }

  try {
    const token = connection.token;

    const stats = await getLeaderboardStats(token, {
      wkUserId: connection.wkUserId ?? "",
      wkUsername: connection.wkUsername ?? "",
      wkLevel: connection.wkLevel ?? 0,
      reviewCount: account.reviewCount,
      burnedCount: account.burnedCount,
      reviewsUpdatedAt: account.reviewsUpdatedAt,
      lastRadicalGuruedAt: account.lastRadicalGuruedAt,
      lastKanjiGuruedAt: account.lastKanjiGuruedAt,
      lastVocabularyGuruedAt: account.lastVocabularyGuruedAt,
      lastRadicalGuruedItem: account.lastRadicalGuruedItem,
      lastKanjiGuruedItem: account.lastKanjiGuruedItem,
      lastVocabularyGuruedItem: account.lastVocabularyGuruedItem,
      assignmentCache: account.assignmentCache,
      assignmentCacheUpdatedAt: account.assignmentCacheUpdatedAt,
      wkHttpCache: account.wkHttpCache,
    }, await rankingWeights());

    const syncedAt = new Date();

    await prisma.account.update({
      where: { id: account.id },
      data: {
        wkUserId: stats.wkUserId,
        wkUsername: stats.wkUsername,
        wkLevel: stats.wkLevel,
        reviewCount: stats.reviewCount,
        burnedCount: stats.burnedCount,
        pendingReviews: stats.pendingReviews,
        radicalCount: stats.radicalCount,
        vocabularyCount: stats.vocabularyCount,
        apprenticeCount: stats.apprenticeCount,
        guruCount: stats.guruCount,
        masterCount: stats.masterCount,
        enlightenedCount: stats.enlightenedCount,
        levelKanjiTotal: stats.levelKanjiTotal,
        levelKanjiLearned: stats.levelKanjiLearned,
        levelKanjiGuruPlus: stats.levelKanjiGuruPlus,
        levelKanjiLocked: stats.levelKanjiLocked,
        estimatedHoursRemaining: stats.estimatedHoursRemaining,
        lastActivityAt: stats.lastActivityAt,
        levelKanjiItems: stats.levelKanjiItems,
        itemSpread: stats.itemSpread,
        jlptCounts: stats.jlptCounts,
        assignmentCache: stats.cache.assignmentCache as Prisma.InputJsonValue,
        assignmentCacheUpdatedAt: stats.cache.assignmentCacheUpdatedAt,
        reviewsUpdatedAt: stats.cache.reviewsUpdatedAt,
        lastRadicalGuruedAt: stats.lastRadicalGuruedAt,
        lastKanjiGuruedAt: stats.lastKanjiGuruedAt,
        lastVocabularyGuruedAt: stats.lastVocabularyGuruedAt,
        lastRadicalGuruedItem: stats.lastRadicalGuruedItem as Prisma.InputJsonValue,
        lastKanjiGuruedItem: stats.lastKanjiGuruedItem as Prisma.InputJsonValue,
        lastVocabularyGuruedItem: stats.lastVocabularyGuruedItem as Prisma.InputJsonValue,
        wkHttpCache: stats.cache.wkHttpCache as Prisma.InputJsonValue,
        score: stats.score,
        lastSyncedAt: syncedAt,
        nextSyncAllowedAt: nowPlus(LEADERBOARD_REFRESH_INTERVAL_MS),
        lastSyncStatus: "ok",
        lastSyncError: null,
        isSyncing: false,
        syncLockUntil: null,
      },
    });

    await upsertDailySnapshot({
      accountId: account.id,
      wkLevel: stats.wkLevel,
      reviewCount: stats.reviewCount,
      burnedCount: stats.burnedCount,
      pendingReviews: stats.pendingReviews,
      radicalCount: stats.radicalCount,
      vocabularyCount: stats.vocabularyCount,
      apprenticeCount: stats.apprenticeCount,
      guruCount: stats.guruCount,
      masterCount: stats.masterCount,
      enlightenedCount: stats.enlightenedCount,
      levelKanjiLearned: stats.levelKanjiLearned,
      levelKanjiTotal: stats.levelKanjiTotal,
      score: stats.score,
      lastActivityAt: stats.lastActivityAt,
      lastSyncedAt: syncedAt,
    });

    return { refreshed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 400) : "unknown-sync-error";

    await prisma.account.update({
      where: { id: account.id },
      data: {
        lastSyncStatus: "error",
        lastSyncError: message,
        nextSyncAllowedAt: nowPlus(FAILURE_COOLDOWN_MS),
        isSyncing: false,
        syncLockUntil: null,
      },
    });

    return { refreshed: false, reason: message };
  }
}
