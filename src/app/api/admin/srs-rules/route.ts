import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { saveSrsScoringRules, srsScoringRules } from "@/lib/srs/srsScoringRules";

const bodySchema = z.object({
  throttleLessonsOnBacklog: z.boolean(),
  backlogThreshold: z.coerce.number().int().min(10).max(2_000),
  leechRule: z.boolean(),
  leechWrongThreshold: z.coerce.number().int().min(3).max(50),
  leechMinStage: z.coerce.number().int().min(1).max(9),
  ghostReviews: z.boolean(),
});

/** The scoring rules as they stand. */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/srs-rules",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        return NextResponse.json({ rules: await srsScoringRules() });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not read the scoring rules." }, { status: 500 });
      }
    },
  });
}

/**
 * Changes how the scheduler scores, immediately.
 *
 * There is no deploy between this and a member's next review, which is the
 * point: how hard a scheduler should be is a judgement you only make properly
 * while watching somebody use it. The bounds are enforced here and again in
 * the parser, so a value that arrives some other way is still bounded.
 */
export async function PATCH(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/srs-rules",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid request." },
            { status: 400 },
          );
        }
        return NextResponse.json({ rules: await saveSrsScoringRules(parsed.data) });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not save the scoring rules." }, { status: 500 });
      }
    },
  });
}
