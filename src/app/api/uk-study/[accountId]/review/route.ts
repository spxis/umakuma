import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { REVIEW_RESULTS } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { srsGroupingFromStage } from "@/lib/srs/srsSchedule";
import { srsTransition } from "@/lib/studyQueueSummary";
import { ukSubjectTypeFor } from "@/lib/uk/ukExplorerFeed";
import { recordUkReview } from "@/lib/uk/ukStudyWrite";
import { mirrorUkReviewToWaniKani } from "@/lib/uk/ukWanikaniMirrorServer";

type RouteContext = { params: Promise<{ accountId: string }> };

/* The explorer's own body: it threads an assignment id through every
   callback, and on our ladder that id is the subject's. */
const bodySchema = z.object({
  assignmentId: z.number().int().positive(),
  result: z.enum([REVIEW_RESULTS.correct, REVIEW_RESULTS.wrong]),
});

/**
 * One answer.
 *
 * Comes back with the level the member now stands on and whether this answer
 * is what moved it, so the page can say so on the answer that earned it
 * rather than on the next load.
 */
export async function POST(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/review",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }

        const outcome = await recordUkReview({
          accountId,
          subjectId: parsed.data.assignmentId,
          result: parsed.data.result,
        });
        if (!outcome) {
          /* No state row means the item was never started - a review for
             something that is still a lesson is a bug in the caller, not a
             server error. */
          return NextResponse.json({ error: "That item has not been started." }, { status: 409 });
        }

        /* After the write, never inside it: a member playing both systems
           gets the same answer sent to WaniKani, and WaniKani's mood cannot
           undo a review that is already theirs here. */
        const mirror = await mirrorUkReviewToWaniKani({ accountId, subjectId: parsed.data.assignmentId, result: parsed.data.result });
        const subject = await prisma.ukSubject.findUnique({ where: { id: outcome.subjectId }, select: { kind: true } });
        const previousGrouping = outcome.previousSrsStage === null ? null : srsGroupingFromStage(outcome.previousSrsStage);
        const newGrouping = outcome.newSrsStage === null ? null : srsGroupingFromStage(outcome.newSrsStage);
        return NextResponse.json({
          ok: true,
          review: {
            assignmentId: outcome.subjectId,
            subjectId: outcome.subjectId,
            subjectType: ukSubjectTypeFor(subject?.kind ?? "kanji"),
            previousSrsStage: outcome.previousSrsStage,
            newSrsStage: outcome.newSrsStage,
            previousGrouping,
            newGrouping,
            transition: srsTransition(previousGrouping, newGrouping),
          },
          level: outcome.level,
          levelledUp: outcome.levelledUp,
          xpAwarded: outcome.xpAwarded,
          xpEarned: outcome.earned,
          mirror,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not record that answer." }, { status: 500 });
      }
    },
  });
}
