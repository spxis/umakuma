import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
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
            availableAt: true,
          },
        });

        const lessons = states.filter((row) => row.srsStage <= 0).length;
        const reviews = states.filter((row) =>
          isCustomReviewReady({
            srsStage: row.srsStage,
            availableAt: row.availableAt,
            now,
          }),
        ).length;

        return NextResponse.json(
          {
            reviews,
            lessons,
            all: reviews + lessons,
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
