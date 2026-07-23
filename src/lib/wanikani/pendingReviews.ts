import { fetchWaniKani } from "./http";
import type { WaniKaniSummaryResponse } from "./types";

export function countPendingReviews(
  summary: WaniKaniSummaryResponse,
  now: Date = new Date(),
): number {
  const nowMs = now.getTime();

  return summary.data.reviews
    .filter((group) => new Date(group.available_at).getTime() <= nowMs)
    .reduce((total, group) => total + group.subject_ids.length, 0);
}

export async function fetchPendingReviews(token: string): Promise<number> {
  const response = await fetchWaniKani<WaniKaniSummaryResponse>("/summary", token);
  if (!response.data) {
    throw new Error("WaniKani summary was unavailable.");
  }

  return countPendingReviews(response.data);
}