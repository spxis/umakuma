import { NextResponse } from "next/server";

import { QUEUE_TYPES } from "@/lib/domainConstants";
import type { getCachedStudyQueue } from "@/lib/studyQueueCache";

type CachedQueue = NonNullable<ReturnType<typeof getCachedStudyQueue>>;

type CachedQueueItem = {
  queueType: typeof QUEUE_TYPES.review | typeof QUEUE_TYPES.lesson;
  subjectId?: number;
};

const EMPTY_TYPE_COUNTS = { all: 0, radical: 0, kanji: 0, vocabulary: 0 } as const;

const EMPTY_SRS_COUNTS = {
  all: 0,
  locked: 0,
  apprentice: 0,
  guru: 0,
  master: 0,
  enlightened: 0,
  burned: 0,
} as const;

/**
 * The queue served straight from cache.
 *
 * The cache always holds the whole sorted queue, because only an unlimited
 * request may write it, so a paged request is answered by slicing rather than
 * rebuilding. The counts come back whole either way — they describe the queue,
 * not the page.
 */
export function cachedStudyQueueResponse(
  cached: CachedQueue,
  offset: number,
  limit: number | null,
): NextResponse {
  const cachedItems = cached.items as CachedQueueItem[];
  const pagedItems = limit === null ? cachedItems : cachedItems.slice(offset, offset + limit);

  return NextResponse.json(
    {
      items: pagedItems,
      counts: cached.counts,
      tagCounts: cached.tagCounts ?? { favorite: 0, trouble: 0 },
      levelCounts: cached.levelCounts ?? {},
      typeCounts: cached.typeCounts ?? { ...EMPTY_TYPE_COUNTS },
      typeCountsByLevel: cached.typeCountsByLevel ?? {},
      srsCounts: cached.srsCounts ?? { ...EMPTY_SRS_COUNTS },
      srsStageCounts: cached.srsStageCounts ?? {},
      pagination: {
        offset,
        limit: limit ?? cachedItems.length,
        total: cachedItems.length,
        hasMore: limit === null ? false : offset + limit < cachedItems.length,
      },
      cached: true,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
      },
    },
  );
}
