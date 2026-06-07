import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import { customItemSupportsWkLevel, resolveCustomItemLevel } from "@/lib/customStudy/customItemLevel";
import { customItemTypeToSubjectType } from "@/lib/customStudy/customStudyQueue";
import { toCustomSrsGrouping } from "@/lib/customStudy/customSrs";
import { SUBJECT_TYPES, WK_STATUSES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string; level: string }>;
};

const querySchema = z.object({
  libraryId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/levels/[level]",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId, level: rawLevel } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const level = Number(rawLevel);
        if (!Number.isInteger(level) || level < 1 || level > 1000) {
          return NextResponse.json({ error: "Invalid level." }, { status: 400 });
        }

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          libraryId: url.searchParams.get("libraryId") ?? "",
          limit: url.searchParams.get("limit") ?? undefined,
          offset: url.searchParams.get("offset") ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const library = await getOwnedCustomLibrary({
          accountId,
          libraryId: parsed.data.libraryId,
        });
        if (!library) {
          return NextResponse.json({ error: "Library not found." }, { status: 404 });
        }

        const states = await prisma.customStudyState.findMany({
          where: {
            accountId,
            libraryId: library.id,
          },
          select: {
            srsStage: true,
            startedAt: true,
            passedAt: true,
            availableAt: true,
            item: {
              select: {
                id: true,
                externalId: true,
                itemType: true,
                ...(customItemSupportsWkLevel ? { wkLevel: true } : {}),
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

        const levelRows = states
          .filter((row) => Boolean(row.item))
          .filter((row) => resolveCustomItemLevel(row.item) === level)
          .sort((left, right) => left.item.externalId.localeCompare(right.item.externalId, undefined, { numeric: true }));

        const allItems = levelRows.map((row) => ({
          subjectId: row.item.id,
          subjectType: customItemTypeToSubjectType(row.item.itemType),
          wkLevel: level,
          characters: row.item.characters,
          meanings: row.item.meanings,
          readings: row.item.readings,
          primaryReadings: row.item.primaryReading ? [row.item.primaryReading] : row.item.readings,
          radicals: [],
          visuallySimilar: [],
          usedInVocabulary: [],
          componentKanji: [],
          meaningExplanation: row.item.meaningMnemonic ?? "",
          readingExplanation: row.item.readingMnemonic ?? "",
          jlptLevel: null,
          jlptMeta: null,
          srsStage: row.srsStage,
          status: toCustomSrsGrouping(row.srsStage),
          startedAt: row.startedAt?.toISOString() ?? null,
          passedAt: row.passedAt?.toISOString() ?? null,
          availableAt: row.availableAt?.toISOString() ?? null,
        }));

        const kanjiItems = allItems.filter((item) => item.subjectType === SUBJECT_TYPES.kanji);
        const kanjiTotal = kanjiItems.length;
        const kanjiLearned = kanjiItems.filter((item) => item.srsStage > 0).length;
        const kanjiGuruPlus = kanjiItems.filter((item) => item.srsStage >= 5).length;
        const kanjiLocked = kanjiItems.filter((item) => item.status === WK_STATUSES.locked).length;

        const limit = parsed.data.limit ?? allItems.length;
        const offset = parsed.data.offset ?? 0;
        const pagedItems = parsed.data.limit ? allItems.slice(offset, offset + limit) : allItems;

        return NextResponse.json(
          {
            snapshot: {
              level,
              kanjiTotal,
              kanjiLearned,
              kanjiGuruPlus,
              kanjiLocked,
              estimatedHoursRemaining: null,
              items: pagedItems,
              syncedAt: new Date().toISOString(),
            },
            pagination: {
              offset,
              limit,
              total: allItems.length,
              hasMore: parsed.data.limit ? offset + limit < allItems.length : false,
            },
          },
          {
            headers: {
              "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
            },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not fetch custom level snapshot." }, { status: 500 });
      }
    },
  });
}
