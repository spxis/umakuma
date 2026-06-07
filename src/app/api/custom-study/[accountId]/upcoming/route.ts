import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import { customItemSupportsWkLevel, resolveCustomItemLevel } from "@/lib/customStudy/customItemLevel";
import { customItemTypeToSubjectType } from "@/lib/customStudy/customStudyQueue";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

type UpcomingReviewItem = {
  subjectId: number;
  subjectType: "radical" | "kanji" | "vocabulary";
  wkLevel: number | null;
  characters: string;
  primaryMeaning: string | null;
  primaryReading: string | null;
  availableAt: string;
};

const querySchema = z.object({
  libraryId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/upcoming",
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
          limit: url.searchParams.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const limit = parsed.data.limit ?? 8;
        const library = await getOwnedCustomLibrary({
          accountId,
          libraryId: parsed.data.libraryId,
        });
        if (!library) {
          return NextResponse.json({ error: "Library not found." }, { status: 404 });
        }

        const now = new Date();
        const whereClause = {
          accountId,
          libraryId: library.id,
          srsStage: {
            gt: 0,
            lt: 9,
          },
          availableAt: {
            gt: now,
          },
        } as const;

        const [totalUpcoming, states] = await Promise.all([
          prisma.customStudyState.count({ where: whereClause }),
          prisma.customStudyState.findMany({
            where: whereClause,
            select: {
              id: true,
              availableAt: true,
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
                },
              },
            },
            orderBy: [{ availableAt: "asc" }, { id: "asc" }],
            take: limit,
          }),
        ]);

        const items = states
          .filter((row) => row.availableAt !== null)
          .map((row): UpcomingReviewItem => ({
            subjectId: row.item.id,
            subjectType: customItemTypeToSubjectType(row.item.itemType, row.item.metadata),
            wkLevel: resolveCustomItemLevel(row.item),
            characters: row.item.characters,
            primaryMeaning: row.item.meanings[0] ?? null,
            primaryReading: row.item.primaryReading ?? row.item.readings[0] ?? null,
            availableAt: row.availableAt!.toISOString(),
          }));

        return NextResponse.json(
          {
            items,
            totalUpcoming,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
            },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not fetch upcoming study reviews." }, { status: 500 });
      }
    },
  });
}
