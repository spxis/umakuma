import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { currentReviewQueueFromAssignmentCache } from "@/lib/readingSignoff";
import { fetchPendingReviews } from "@/lib/wanikani/pendingReviews";

export class ReadingReviewRefreshError extends Error {}

export function resolveReadingReviewCredit(input: {
  requested: boolean;
  pendingReviews: number;
  alreadyGranted: boolean;
}) {
  const grantedNow = input.requested && input.pendingReviews === 0 && !input.alreadyGranted;
  const grantedForDay = input.alreadyGranted || grantedNow;

  return {
    grantedNow,
    grantedForDay,
    reviewsLeftForDay: grantedForDay ? 0 : input.pendingReviews,
  };
}

export async function refreshReadingCheckinReviewState(account: {
  id: string;
  assignmentCache: unknown;
  tokenEncrypted: string;
  tokenIv: string;
  tokenTag: string;
}) {
  const reviewQueue = currentReviewQueueFromAssignmentCache(account.assignmentCache);

  try {
    const pendingReviewsAtSave = await fetchPendingReviews(decryptToken({
      encrypted: account.tokenEncrypted,
      iv: account.tokenIv,
      tag: account.tokenTag,
    }));
    await prisma.account.update({
      where: { id: account.id },
      data: { pendingReviews: pendingReviewsAtSave },
    });
    return { reviewQueue, pendingReviewsAtSave };
  } catch (error) {
    console.error("Could not refresh WaniKani reviews for reading check-in", error);
    throw new ReadingReviewRefreshError();
  }
}

export function toReadingReviewQueueSnapshot(row: {
  id: string;
  pendingReviews: number;
  assignmentCache: unknown;
}) {
  const queue = currentReviewQueueFromAssignmentCache(row.assignmentCache);
  const total = Math.max(0, row.pendingReviews ?? queue.total);
  const queueAtSave = total === 0
    ? { radical: 0, kanji: 0, vocabulary: 0 }
    : { radical: queue.radical, kanji: queue.kanji, vocabulary: queue.vocabulary };

  return {
    accountId: row.id,
    radical: queueAtSave.radical,
    kanji: queueAtSave.kanji,
    vocabulary: queueAtSave.vocabulary,
    total,
  };
}
