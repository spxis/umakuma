import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { applyWanikaniBurned, wanikaniBurnedRemaining } from "@/lib/burnFromWanikani";
import { clearStudyQueueCache } from "@/lib/studyQueueCache";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

/** How many of WaniKani's burned items this member could apply. */
export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/tags/burned/wanikani",
    method: "GET",
    request,
    execute: async () => {
      const { accountId } = await context.params;
      if (!(await canAccessAccount(request, accountId))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      return NextResponse.json({ candidates: await wanikaniBurnedRemaining(accountId) });
    },
  });
}

/** Apply them, on the member's say-so. */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/tags/burned/wanikani",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const outcome = await applyWanikaniBurned(accountId);
        clearStudyQueueCache(accountId);
        return NextResponse.json(outcome);
      } catch (error) {
        console.error("Failed to apply WaniKani burned items", error);
        return NextResponse.json({ error: "Could not apply them." }, { status: 500 });
      }
    },
  });
}
