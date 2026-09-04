import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { QUEUE_TYPES } from "@/lib/domainConstants";
import { deriveUkLevel } from "@/lib/uk/ukLevelServer";
import { ukLessons, ukReviews, ukStudyCounts } from "@/lib/uk/ukStudyQueue";

type RouteContext = { params: Promise<{ accountId: string }> };

const querySchema = z.object({
  mode: z.enum([QUEUE_TYPES.review, QUEUE_TYPES.lesson, "all"]).default("all"),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

/**
 * What a member has to do on the UmaKuma ladder.
 *
 * Unlike the custom-study route beside it, there is no library to name: there
 * is one curriculum and every member is on it. What varies is where they
 * stand, which the counts and the level come back with, so a page can draw the
 * whole picture from one call.
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

        const { mode, limit } = parsed.data;
        const [counts, level, lessons, reviews] = await Promise.all([
          ukStudyCounts(accountId),
          deriveUkLevel(accountId),
          mode === QUEUE_TYPES.review ? Promise.resolve([]) : ukLessons(accountId, limit),
          mode === QUEUE_TYPES.lesson ? Promise.resolve([]) : ukReviews(accountId, new Date(), limit),
        ]);

        return NextResponse.json(
          { counts, level: level.level, progress: level, lessons, reviews },
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
