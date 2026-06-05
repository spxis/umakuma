import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getOwnedCustomLibrary } from "@/lib/customStudy/customLibraryAccess";
import {
  customItemTypeToSubjectType,
  isCustomLessonState,
  isCustomReviewReady,
} from "@/lib/customStudy/customStudyQueue";
import {
  nextCustomSrsStage,
  nextCustomStageAvailableAt,
  toCustomSrsGrouping,
} from "@/lib/customStudy/customSrs";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const reviewSchema = z.object({
  assignmentId: z.number().int().positive(),
  libraryId: z.string().trim().min(1),
  result: z.enum(["correct", "wrong"]),
});

function transitionDirection(params: {
  previousGrouping: string | null;
  newGrouping: string | null;
}): "promoted" | "demoted" | "unchanged" | "unknown" {
  const { previousGrouping, newGrouping } = params;
  if (!previousGrouping || !newGrouping) {
    return "unknown";
  }

  if (previousGrouping === newGrouping) {
    return "unchanged";
  }

  const groupingOrder = ["locked", "apprentice", "guru", "master", "enlightened", "burned"];
  const previousIndex = groupingOrder.indexOf(previousGrouping);
  const nextIndex = groupingOrder.indexOf(newGrouping);
  if (previousIndex < 0 || nextIndex < 0) {
    return "unknown";
  }

  return nextIndex > previousIndex ? "promoted" : "demoted";
}

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/custom-study/[accountId]/review",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const json = await request.json();
        const parsed = reviewSchema.safeParse(json);
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
            itemId: true,
            srsStage: true,
            availableAt: true,
            startedAt: true,
            passedAt: true,
            item: {
              select: {
                itemType: true,
              },
            },
          },
        });

        if (!state) {
          return NextResponse.json({ ok: true, skipped: true, reason: "already-reviewed-or-unavailable" });
        }

        if (!state.item) {
          return NextResponse.json({ ok: true, skipped: true, reason: "already-reviewed-or-unavailable" });
        }

        const now = new Date();
        if (
          isCustomLessonState(state.srsStage) ||
          !isCustomReviewReady({
            srsStage: state.srsStage,
            availableAt: state.availableAt,
            now,
          })
        ) {
          return NextResponse.json({ ok: true, skipped: true, reason: "already-reviewed-or-unavailable" });
        }

        const previousSrsStage = state.srsStage;
        const newSrsStage = nextCustomSrsStage({
          currentStage: state.srsStage,
          result: parsed.data.result,
        });
        const previousGrouping = toCustomSrsGrouping(previousSrsStage);
        const newGrouping = toCustomSrsGrouping(newSrsStage);

        await prisma.$transaction([
          prisma.customStudyState.update({
            where: { id: state.id },
            data: {
              srsStage: newSrsStage,
              availableAt: nextCustomStageAvailableAt(newSrsStage, now),
              lastReviewedAt: now,
              startedAt: state.startedAt ?? now,
              passedAt: state.passedAt ?? (newSrsStage >= 5 ? now : null),
              burnedAt: newSrsStage >= 9 ? now : null,
              reviewCount: { increment: 1 },
              correctCount: parsed.data.result === "correct" ? { increment: 1 } : undefined,
              wrongCount: parsed.data.result === "wrong" ? { increment: 1 } : undefined,
            },
          }),
          prisma.customStudyReviewAttempt.create({
            data: {
              accountId,
              libraryId: library.id,
              stateId: state.id,
              itemId: state.itemId,
              result: parsed.data.result,
              previousSrsStage,
              newSrsStage,
            },
          }),
        ]);

        return NextResponse.json({
          ok: true,
          review: {
            assignmentId: state.id,
            subjectId: state.itemId,
            subjectType: customItemTypeToSubjectType(state.item.itemType),
            previousSrsStage,
            newSrsStage,
            previousGrouping,
            newGrouping,
            transition: transitionDirection({ previousGrouping, newGrouping }),
          },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not submit review result." }, { status: 500 });
      }
    },
  });
}
