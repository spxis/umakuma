import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import { customItemSupportsWkLevel, resolveCustomItemLevel } from "@/lib/customStudy/customItemLevel";
import { isCustomLevelUnlocked, resolveCurrentCustomLevel } from "@/lib/customStudy/customLevelUnlock";
import { isCustomReviewReady } from "@/lib/customStudy/customStudyQueue";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const querySchema = z.object({
  libraryId: z.string().trim().min(1),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/counts",
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

        const now = new Date();
        const states = await prisma.customStudyState.findMany({
          where: {
            accountId,
            libraryId: library.id,
          },
          select: {
            srsStage: true,
            passedAt: true,
            availableAt: true,
            item: {
              select: {
                ...(customItemSupportsWkLevel ? { wkLevel: true } : {}),
                itemType: true,
              },
            },
          },
        });

        const validStates = states.filter((row) => Boolean(row.item));

        const { currentLevel, maxLevel } = resolveCurrentCustomLevel(
          validStates.map((row) => ({
            ukLevel: resolveCustomItemLevel(row.item),
            srsStage: row.srsStage,
            passedAt: row.passedAt,
          })),
        );

        const lessons = validStates.filter(
          (row) =>
            row.srsStage <= 0 &&
            isCustomLevelUnlocked({
              itemLevel: resolveCustomItemLevel(row.item),
              currentLevel,
            }),
        ).length;
        const reviews = validStates.filter((row) =>
          isCustomReviewReady({
            srsStage: row.srsStage,
            availableAt: row.availableAt,
            now,
          }),
        ).length;
        const reviewsTotal = validStates.filter((row) => row.srsStage > 0 && row.srsStage < 9).length;

        return NextResponse.json(
          {
            reviews,
            reviewsTotal,
            lessons,
            all: reviews + lessons,
            currentLevel,
            maxLevel,
          },
          {
            headers: {
              "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
            },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not fetch custom study counts." }, { status: 500 });
      }
    },
  });
}
