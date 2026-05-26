import { currentReviewQueueFromAssignmentCache } from "@/lib/readingSignoff";

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
