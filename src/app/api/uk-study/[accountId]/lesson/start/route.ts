import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { startUkLessons } from "@/lib/uk/ukStudyWrite";

type RouteContext = { params: Promise<{ accountId: string }> };

/* The explorer starts one lesson at a time, by the id it threads through
   every callback - on our ladder, the subject's. */
const bodySchema = z.object({
  assignmentId: z.number().int().positive(),
});

/** Opens items as lessons. The level check happens server-side, not here. */
export async function POST(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/lesson/start",
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

        const { started, earned } = await startUkLessons({ accountId, subjectIds: [parsed.data.assignmentId] });
        return NextResponse.json({ started, xpEarned: earned });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not start those lessons." }, { status: 500 });
      }
    },
  });
}
