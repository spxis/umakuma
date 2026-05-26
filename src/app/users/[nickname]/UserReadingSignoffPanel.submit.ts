export type ReadingSignoffSubmitResponse = {
  error?: string;
  waniKaniCreditRequested?: boolean;
  waniKaniCreditGranted?: boolean;
  pendingReviewsAtSave?: number;
};

export function buildCheckinSavedMessage(payload: ReadingSignoffSubmitResponse): string {
  if (!payload.waniKaniCreditRequested) {
    return "Check-in saved.";
  }

  if (payload.waniKaniCreditGranted) {
    return "Check-in saved. 0-review credit confirmed.";
  }

  const savedPendingReviews = Math.max(0, payload.pendingReviewsAtSave ?? 0);
  return `Reading saved. WaniKani credit needs 0 reviews due (${savedPendingReviews} left).`;
}
