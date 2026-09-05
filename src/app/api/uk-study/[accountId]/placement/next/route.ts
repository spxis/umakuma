import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { PLACEMENT_PROBE_SIZE } from "@/lib/uk/placementStaircase";
import { answerPlacement } from "@/lib/uk/placementServer";

type RouteContext = { params: Promise<{ accountId: string }> };

const bodySchema = z.object({
  ticket: z.string().min(1).max(8_000),
  /* One per question. Zero is allowed only alongside `stop`, which abandons
     the probe on screen rather than scoring it. */
  chosenSubjectIds: z.array(z.number().int().positive()).max(PLACEMENT_PROBE_SIZE).default([]),
  stop: z.boolean().default(false),
});

/**
 * Scores a probe and answers with the next one, or with the verdict.
 *
 * The ticket carries both the history and which tile was right, signed, so
 * this route never has to trust the page about either. A ticket that does not
 * verify is a 400: the alternative is scoring answers to questions nobody can
 * show were asked.
 */
export async function POST(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/placement/next",
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

        const step = await answerPlacement({ accountId, ...parsed.data });
        if (!step) {
          return NextResponse.json({ error: "That placement test has expired." }, { status: 400 });
        }

        return NextResponse.json(step, { headers: { "Cache-Control": "private, no-store" } });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not record that answer." }, { status: 500 });
      }
    },
  });
}
