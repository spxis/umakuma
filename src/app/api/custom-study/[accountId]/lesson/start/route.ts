import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import { initialCustomLessonState } from "@/lib/customStudy/customSrs";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const lessonStartSchema = z.object({
  assignmentId: z.number().int().positive(),
  libraryId: z.string().trim().min(1),
});

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/lesson/start",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const json = await request.json();
        const parsed = lessonStartSchema.safeParse(json);
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

        const state = await prisma.customStudyState.findFirst({
          where: {
            id: parsed.data.assignmentId,
            accountId,
            libraryId: library.id,
          },
          select: {
            id: true,
            srsStage: true,
            startedAt: true,
            unlockedAt: true,
          },
        });

        if (!state) {
          return NextResponse.json({ error: "Study item not found." }, { status: 404 });
        }

        if (state.srsStage > 0) {
          return NextResponse.json({ ok: true, skipped: true, reason: "already-started-or-unavailable" });
        }

        const now = new Date();
        const nextState = initialCustomLessonState(now);

        await prisma.customStudyState.update({
          where: { id: state.id },
          data: {
            srsStage: nextState.srsStage,
            availableAt: nextState.availableAt,
            startedAt: state.startedAt ?? nextState.startedAt,
            unlockedAt: state.unlockedAt ?? nextState.unlockedAt,
          },
        });

        return NextResponse.json({ ok: true });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not start lesson." }, { status: 500 });
      }
    },
  });
}
