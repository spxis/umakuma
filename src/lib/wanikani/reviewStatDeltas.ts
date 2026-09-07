import { REVIEW_RESULTS, type ReviewResult } from "@/lib/domainConstants";

/**
 * What a member answered on WaniKani, worked out from the counters.
 *
 * **WaniKani's `/reviews` collection does not contain reviews taken in their
 * app.** Measured against John's own account on 2026-09-07: `total_count` 0,
 * with and without `updated_after`, while `/review_statistics` held 2,774 rows
 * last updated that morning at 06:31. That collection only logs reviews
 * submitted through the API, which is what our own review button does - so a
 * review answered in WaniKani's app was never going to appear in it, and the
 * sync has been fetching an empty collection on every pass for months.
 *
 * What the API does expose is the running totals per subject, and when that
 * subject was last answered. So a review is inferred rather than read: a
 * counter that has gone up since the last look is a review that happened, the
 * increase says how many and which way, and `data_updated_at` says when.
 *
 * THE ARITHMETIC, and its one real approximation. A kanji review asks for the
 * meaning and the reading, and answering it moves both counters - so counting
 * each counter as a review would double every one of them. The number of
 * reviews is the larger of the two halves' movement, and a review counts as
 * wrong when either half was missed, which is WaniKani's own rule for whether
 * an item goes back down. What cannot be recovered is the order: three
 * reviews of one subject between two syncs, one of them wrong, arrive as one
 * wrong and two correct, all stamped at the same moment.
 *
 * And it cannot reach backwards at all. Only the totals exist, so the first
 * look at an account is a snapshot with no attempts drawn from it - otherwise
 * every member would wake up to nine thousand reviews taken at once.
 */

/** The four counters, in the order the snapshot stores them. */
export type ReviewStatCounts = readonly [
  meaningCorrect: number,
  meaningIncorrect: number,
  readingCorrect: number,
  readingIncorrect: number,
];

/** What was held at the last look, by subject id. Compact on purpose: this
 * rides on the account row beside the assignment cache, at 2,774 subjects. */
export type ReviewStatSnapshot = Record<string, ReviewStatCounts>;

export type ReviewStatRow = {
  subjectId: number;
  counts: ReviewStatCounts;
  /** When that subject was last answered, which is the only clock we get. */
  updatedAt: Date | null;
};

export type DerivedAttempt = {
  subjectId: number;
  result: ReviewResult;
  at: Date;
};

function counted(row: ReviewStatRow, index: 0 | 1 | 2 | 3): number {
  const value = row.counts[index];
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Never negative: WaniKani can reset an item, and a reset is not a review. */
function grown(now: number, before: number): number {
  return Math.max(0, now - before);
}

export function diffReviewStats(
  previous: ReviewStatSnapshot | null,
  rows: readonly ReviewStatRow[],
  seenAt: Date,
): { attempts: DerivedAttempt[]; snapshot: ReviewStatSnapshot } {
  const snapshot: ReviewStatSnapshot = { ...(previous ?? {}) };
  const attempts: DerivedAttempt[] = [];

  for (const row of rows) {
    const key = String(row.subjectId);
    const counts: ReviewStatCounts = [counted(row, 0), counted(row, 1), counted(row, 2), counted(row, 3)];
    const before = previous?.[key] ?? [0, 0, 0, 0];
    snapshot[key] = counts;

    /* The first look at an account is a snapshot and nothing more. */
    if (previous === null) continue;

    const meaning = grown(counts[0] + counts[1], before[0] + before[1]);
    const reading = grown(counts[2] + counts[3], before[2] + before[3]);
    const reviews = Math.max(meaning, reading);
    if (reviews === 0) continue;

    /* Wrong if either half was missed - WaniKani's own rule for whether the
       item goes back down a stage. */
    const wrong = Math.min(reviews, Math.max(grown(counts[1], before[1]), grown(counts[3], before[3])));
    const at = row.updatedAt ?? seenAt;

    for (let index = 0; index < reviews; index += 1) {
      attempts.push({
        subjectId: row.subjectId,
        result: index < wrong ? REVIEW_RESULTS.wrong : REVIEW_RESULTS.correct,
        at,
      });
    }
  }

  return { attempts, snapshot };
}

/** The rows as they arrive from the API, in the shape the diff wants. */
export function toReviewStatRows(collection: readonly unknown[]): ReviewStatRow[] {
  const rows: ReviewStatRow[] = [];

  for (const entry of collection) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { data_updated_at?: unknown; data?: Record<string, unknown> };
    const data = row.data;
    if (!data || typeof data.subject_id !== "number") continue;

    const number = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
    const updatedAt = typeof row.data_updated_at === "string" ? new Date(row.data_updated_at) : null;

    rows.push({
      subjectId: data.subject_id,
      counts: [
        number(data.meaning_correct),
        number(data.meaning_incorrect),
        number(data.reading_correct),
        number(data.reading_incorrect),
      ],
      updatedAt: updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt : null,
    });
  }

  return rows;
}

/** What the snapshot column holds, read back defensively. */
export function parseReviewStatSnapshot(input: unknown): ReviewStatSnapshot | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const snapshot: ReviewStatSnapshot = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(value) || value.length !== 4) continue;
    const counts = value.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : 0));
    snapshot[key] = [counts[0]!, counts[1]!, counts[2]!, counts[3]!];
  }

  return snapshot;
}
