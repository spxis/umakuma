/**
 * Trouble items, mixed into a sitting.
 *
 * A member who marked something as trouble wants to meet it again before
 * the schedule brings it round. The WaniKani queue has done this from the
 * start: a few tagged items, spaced through the reviews, answered as
 * practice so the SRS is untouched. The arithmetic and the spacing lived in
 * that route; our queue does the same sitting now, so they live here.
 */

/** A quarter of the sitting, at most twenty, never more than there are. */
export function troubleInjectionCount(reviewCount: number, availableTroubleCount: number): number {
  if (availableTroubleCount <= 0) return 0;
  if (reviewCount <= 0) return Math.min(10, availableTroubleCount);
  return Math.max(0, Math.min(Math.ceil(reviewCount * 0.25), 20, availableTroubleCount));
}

/**
 * The injected items spread evenly through the reviews - every third at the
 * closest, never bunched at the end - with any left over after the last
 * review following it.
 */
export function interleaveInjected<T>(reviews: readonly T[], injected: readonly T[]): T[] {
  if (injected.length === 0) return [...reviews];
  if (reviews.length === 0) return [...injected];

  const spacing = Math.max(3, Math.floor(reviews.length / injected.length) || 1);
  const merged: T[] = [];
  let next = 0;
  reviews.forEach((review, index) => {
    merged.push(review);
    if ((index + 1) % spacing === 0 && next < injected.length) {
      merged.push(injected[next]!);
      next += 1;
    }
  });
  while (next < injected.length) {
    merged.push(injected[next]!);
    next += 1;
  }
  return merged;
}
