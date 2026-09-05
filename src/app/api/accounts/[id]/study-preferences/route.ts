import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { STUDY_REVIEW_ORDERS, STUDY_TEST_INTERVALS } from "@/lib/srs/studyPreferences";
import { memberStudyPreferences, saveMemberStudyPreferences } from "@/lib/srs/studyPreferencesServer";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  reviewOrder: z.enum([
    STUDY_REVIEW_ORDERS.overdue,
    STUDY_REVIEW_ORDERS.lowestStage,
    STUDY_REVIEW_ORDERS.shuffled,
  ]),
  testInterval: z.union(STUDY_TEST_INTERVALS.map((n) => z.literal(n)) as never),
  batchSize: z.coerce.number().int().min(3).max(50),
  throttleLessons: z.enum(["site", "on", "off"]),
  dailyLessonCap: z.coerce.number().int().min(0).max(200),
  showLeechFlag: z.boolean(),
});

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/study-preferences",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, id))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        return NextResponse.json({ preferences: await memberStudyPreferences(id) });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read your study settings." }, { status: 500 });
      }
    },
  });
}

/** A member changing how they study. Never what a level means — see studyPreferences.ts. */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/study-preferences",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, id))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request." }, { status: 400 });
        }
        return NextResponse.json({ preferences: await saveMemberStudyPreferences(id, parsed.data) });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not save that." }, { status: 500 });
      }
    },
  });
}
