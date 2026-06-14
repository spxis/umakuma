import { QUEUE_TYPES, type QueueType } from "@/lib/domainConstants";

export function queueModeSegmentClass(mode: QueueType, activeMode: QueueType): string {
  const active = mode === activeMode;
  if (!active) {
    return "inline-flex h-7 flex-1 items-center justify-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground hover:bg-surface-muted sm:h-8 sm:px-4 sm:text-xs sm:tracking-[0.1em]";
  }

  return mode === QUEUE_TYPES.review
    ? "inline-flex h-7 flex-1 items-center justify-center rounded-full border border-amber-500 bg-amber-500 px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white sm:h-8 sm:px-4 sm:text-xs sm:tracking-[0.1em]"
    : "inline-flex h-7 flex-1 items-center justify-center rounded-full border border-sky-500 bg-sky-500 px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white sm:h-8 sm:px-4 sm:text-xs sm:tracking-[0.1em]";
}

export function formatReviewCountLabel(studyCounts: { reviews?: number; reviewsTotal?: number } | null | undefined): string {
  if (typeof studyCounts?.reviews !== "number") {
    return "...";
  }

  const total = typeof studyCounts.reviewsTotal === "number"
    ? studyCounts.reviewsTotal
    : studyCounts.reviews;
  return `${studyCounts.reviews}/${total}`;
}
