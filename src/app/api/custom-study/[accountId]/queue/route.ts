import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import {
  isCustomLessonState,
  isCustomReviewReady,
  mapCustomQueueItem,
  type CustomStateQueueRow,
} from "@/lib/customStudy/customStudyQueue";
import { QUEUE_TYPES, SUBJECT_TYPES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const querySchema = z.object({
  libraryId: z.string().trim().min(1),
  mode: z.enum([QUEUE_TYPES.review, QUEUE_TYPES.lesson, "all"]).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const emptySrsCounts = {
  all: 0,
  locked: 0,
  apprentice: 0,
  guru: 0,
  master: 0,
  enlightened: 0,
  burned: 0,
};

const emptyTypeCounts = {
  all: 0,
  [SUBJECT_TYPES.radical]: 0,
  [SUBJECT_TYPES.kanji]: 0,
  [SUBJECT_TYPES.vocabulary]: 0,
};

function sortQueueRows(rows: CustomStateQueueRow[], mode: "review" | "lesson" | "all"): CustomStateQueueRow[] {
  if (mode === QUEUE_TYPES.lesson) {
    return [...rows].sort((a, b) => a.item.id - b.item.id);
  }

  if (mode === QUEUE_TYPES.review) {
    return [...rows].sort((a, b) => {
      const aTime = a.availableAt?.getTime() ?? 0;
      const bTime = b.availableAt?.getTime() ?? 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return a.item.id - b.item.id;
    });
  }

  return [...rows].sort((a, b) => {
    const aLesson = isCustomLessonState(a.srsStage) ? 1 : 0;
    const bLesson = isCustomLessonState(b.srsStage) ? 1 : 0;
    if (aLesson !== bLesson) {
      return aLesson - bLesson;
    }

    const aTime = a.availableAt?.getTime() ?? 0;
    const bTime = b.availableAt?.getTime() ?? 0;
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.item.id - b.item.id;
  });
}

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/queue",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          libraryId: url.searchParams.get("libraryId") ?? "",
          mode: url.searchParams.get("mode") ?? undefined,
          limit: url.searchParams.get("limit") ?? undefined,
          offset: url.searchParams.get("offset") ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const mode = parsed.data.mode ?? QUEUE_TYPES.review;
        const limit = parsed.data.limit ?? 50;
        const offset = parsed.data.offset ?? 0;

        const library = await getOwnedCustomLibrary({
          accountId,
          libraryId: parsed.data.libraryId,
        });
        if (!library) {
          return NextResponse.json({ error: "Library not found." }, { status: 404 });
        }

        const now = new Date();
        const states = await prisma.customStudyState.findMany({
          where: {
            accountId,
            libraryId: library.id,
          },
          select: {
            id: true,
            srsStage: true,
            availableAt: true,
            startedAt: true,
            passedAt: true,
            item: {
              select: {
                id: true,
                itemType: true,
                characters: true,
                meanings: true,
                readings: true,
                primaryReading: true,
                meaningMnemonic: true,
                readingMnemonic: true,
              },
            },
          },
        });

        const lessons = states.filter((row) => isCustomLessonState(row.srsStage));
        const reviews = states.filter((row) =>
          isCustomReviewReady({
            srsStage: row.srsStage,
            availableAt: row.availableAt,
            now,
          }),
        );

        const rowsForMode =
          mode === QUEUE_TYPES.lesson
            ? lessons
            : mode === QUEUE_TYPES.review
              ? reviews
              : [...reviews, ...lessons];
        const sortedRows = sortQueueRows(rowsForMode, mode);
        const allItems = sortedRows.map((row) => mapCustomQueueItem(row as CustomStateQueueRow, now));
        const pagedItems = allItems.slice(offset, offset + limit);

        const typeCounts = allItems.reduce(
          (acc, item) => {
            acc.all += 1;
            acc[item.subjectType] += 1;
            return acc;
          },
          { ...emptyTypeCounts },
        );

        const srsCounts = allItems.reduce(
          (acc, item) => {
            acc.all += 1;
            acc[item.status] += 1;
            return acc;
          },
          { ...emptySrsCounts },
        );

        const srsStageCounts = allItems.reduce<Record<number, number>>((acc, item) => {
          acc[item.srsStage] = (acc[item.srsStage] ?? 0) + 1;
          return acc;
        }, {});

        const totalForMode = allItems.length;
        const counts = {
          reviews: reviews.length,
          lessons: lessons.length,
          all: reviews.length + lessons.length,
        };

        return NextResponse.json(
          {
            items: pagedItems,
            counts,
            levelCounts: {},
            typeCounts,
            typeCountsByLevel: {},
            srsCounts,
            srsStageCounts,
            pagination: {
              offset,
              limit,
              total: totalForMode,
              hasMore: offset + limit < totalForMode,
            },
            cached: false,
          },
          {
            headers: {
              "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
            },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not fetch custom study queue." }, { status: 500 });
      }
    },
  });
}
