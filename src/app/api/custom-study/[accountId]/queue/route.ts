import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import { customItemSupportsWkLevel, resolveCustomItemLevel } from "@/lib/customStudy/customItemLevel";
import { isCustomLevelUnlocked, resolveCurrentCustomLevel } from "@/lib/customStudy/customLevelUnlock";
import {
  isCustomLessonState,
  isCustomReviewReady,
  mapCustomQueueItem,
  type CustomStateQueueRow,
} from "@/lib/customStudy/customStudyQueue";
import { loadCustomStudyFacts, withCustomStudyFacts } from "@/lib/customStudy/customStudyFacts";
import { QUEUE_TYPES, SUBJECT_TYPES } from "@/lib/domainConstants";
import { asInjectedTrouble, withStudyTags } from "@/lib/studyQueueMarks";
import { fetchStudyTagRows } from "@/lib/studySubjectTags";
import { interleaveInjected, troubleInjectionCount } from "@/lib/troubleInjection";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const querySchema = z.object({
  includeTrouble: z.enum(["0", "1"]).optional(),
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

function createEmptyTypeCounts() {
  return {
    all: 0,
    [SUBJECT_TYPES.radical]: 0,
    [SUBJECT_TYPES.kanji]: 0,
    [SUBJECT_TYPES.vocabulary]: 0,
  };
}

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
          includeTrouble: url.searchParams.get("includeTrouble") ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const mode = parsed.data.mode ?? QUEUE_TYPES.review;
        const limit = typeof parsed.data.limit === "number" ? parsed.data.limit : null;
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
                ...(customItemSupportsWkLevel ? { wkLevel: true } : {}),
                itemType: true,
                metadata: true,
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

        const validStates = states.filter((row) => Boolean(row.item && typeof row.item.id === "number"));

        const { currentLevel } = resolveCurrentCustomLevel(
          validStates.map((row) => ({
            unLevel: resolveCustomItemLevel(row.item),
            srsStage: row.srsStage,
            passedAt: row.passedAt,
          })),
        );

        const lessons = validStates.filter(
          (row) =>
            isCustomLessonState(row.srsStage) &&
            isCustomLevelUnlocked({
              itemLevel: resolveCustomItemLevel(row.item),
              currentLevel,
            }),
        );
        const reviews = validStates.filter((row) =>
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
        const [account, tagRows] = await Promise.all([
          prisma.account.findUnique({ where: { id: accountId }, select: { wkLevel: true, ladderStream: true } }),
          fetchStudyTagRows(accountId),
        ]);
        const mapped = sortedRows.map((row) => mapCustomQueueItem(row as CustomStateQueueRow, now));
        /* Trouble, mixed in: tagged items already met in this library and not
           in the sitting, a quarter of it at most, answered as practice. */
        const troubleIds = new Set(tagRows.filter((row) => row.trouble).map((row) => row.subjectId));
        const inSitting = new Set(mapped.map((item) => item.subjectId));
        const candidates =
          mode !== QUEUE_TYPES.lesson && parsed.data.includeTrouble === "1"
            ? validStates
                .filter((row) => !isCustomLessonState(row.srsStage))
                .map((row) => mapCustomQueueItem(row as CustomStateQueueRow, now))
                .filter((item) => troubleIds.has(item.subjectId) && !inSitting.has(item.subjectId))
                .sort((a, b) => a.subjectId - b.subjectId)
            : [];
        const injected = candidates.slice(0, troubleInjectionCount(reviews.length, candidates.length)).map(asInjectedTrouble);
        const facts = await loadCustomStudyFacts([...mapped, ...injected], {
          wkLevel: account?.wkLevel ?? null,
          ladderStream: account?.ladderStream ?? null,
        });
        const allItems = withStudyTags(
          withCustomStudyFacts(mode === QUEUE_TYPES.lesson ? mapped : interleaveInjected(mapped, injected), facts),
          tagRows,
        );
        const pagedItems = limit === null ? allItems : allItems.slice(offset, offset + limit);

        const typeCounts = allItems.reduce(
          (acc, item) => {
            acc.all += 1;
            acc[item.subjectType] += 1;
            return acc;
          },
          { ...emptyTypeCounts },
        );

        const levelCounts = allItems.reduce<Record<number, number>>((acc, item) => {
          if (typeof item.wkLevel !== "number" || item.wkLevel <= 0) {
            return acc;
          }

          acc[item.wkLevel] = (acc[item.wkLevel] ?? 0) + 1;
          return acc;
        }, {});

        const typeCountsByLevel = allItems.reduce<Record<number, ReturnType<typeof createEmptyTypeCounts>>>((acc, item) => {
          if (typeof item.wkLevel !== "number" || item.wkLevel <= 0) {
            return acc;
          }

          const row = acc[item.wkLevel] ?? createEmptyTypeCounts();
          row.all += 1;
          row[item.subjectType] += 1;
          acc[item.wkLevel] = row;
          return acc;
        }, {});

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
            levelCounts,
            typeCounts,
            typeCountsByLevel,
            srsCounts,
            srsStageCounts,
            pagination: {
              offset,
              limit: limit ?? totalForMode,
              total: totalForMode,
              hasMore: limit === null ? false : offset + limit < totalForMode,
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
