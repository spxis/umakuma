import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { QUEUE_TYPES } from "@/lib/domainConstants";
import { summariseStudyQueue } from "@/lib/studyQueueSummary";
import { mapUkQueueItem } from "@/lib/uk/ukExplorerFeed";
import { ukLessons, ukReviews } from "@/lib/uk/ukStudyQueue";

type RouteContext = { params: Promise<{ accountId: string }> };

const ALL = "all";
const querySchema = z.object({
  mode: z.enum([QUEUE_TYPES.review, QUEUE_TYPES.lesson, ALL]).default(QUEUE_TYPES.review),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Enough of the ladder for one sitting; the explorer pages the rest. */
const FEED_CEILING = 500;

/**
 * The UmaKuma queue, in the shape every study source answers with.
 *
 * Reviews first, then lessons, the way the other feeds order "all": the
 * lessons are held behind the reviews on purpose (see `ukLessonThrottle`).
 */
export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/queue",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }
        const { mode, offset } = parsed.data;
        const limit = parsed.data.limit ?? null;
        const now = new Date();
        const [lessons, reviews] = await Promise.all([
          mode === QUEUE_TYPES.review ? Promise.resolve([]) : ukLessons(accountId, FEED_CEILING),
          mode === QUEUE_TYPES.lesson ? Promise.resolve([]) : ukReviews(accountId, now, FEED_CEILING),
        ]);
        const allItems = [...reviews, ...lessons].map(mapUkQueueItem);
        const pagedItems = limit === null ? allItems : allItems.slice(offset, offset + limit);
        const total = allItems.length;

        return NextResponse.json(
          {
            items: pagedItems,
            counts: { reviews: reviews.length, lessons: lessons.length, all: total },
            ...summariseStudyQueue(allItems),
            pagination: { offset, limit: limit ?? total, total, hasMore: limit === null ? false : offset + limit < total },
            cached: false,
          },
          /* Private: this is one member's own standing, and it changes on
             every answer they give. */
          { headers: { "Cache-Control": "private, no-store" } },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the queue." }, { status: 500 });
      }
    },
  });
}
