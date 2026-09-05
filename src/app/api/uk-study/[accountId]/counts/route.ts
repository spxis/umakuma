import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { deriveUkLevel } from "@/lib/uk/ukLevelServer";
import { ukStudyCounts } from "@/lib/uk/ukStudyQueue";

type RouteContext = { params: Promise<{ accountId: string }> };

/**
 * The numbers beside the queue: what the explorer's source switch reads
 * (reviews, lessons, the level and the ladder's top), and what the UmaKuma
 * page adds to them - the throttle, what is due later today, and the
 * standing behind the level, gate and all.
 */
export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/counts",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const [counts, progress] = await Promise.all([ukStudyCounts(accountId), deriveUkLevel(accountId)]);
        return NextResponse.json(
          {
            reviews: counts.reviews,
            reviewsTotal: counts.reviews,
            lessons: counts.lessons,
            all: counts.reviews + counts.lessons,
            currentLevel: progress.level,
            maxLevel: KANJI_LADDER_LEVELS,
            upcoming: counts.upcoming,
            throttle: counts.throttle,
            progress,
          },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the counts." }, { status: 500 });
      }
    },
  });
}
