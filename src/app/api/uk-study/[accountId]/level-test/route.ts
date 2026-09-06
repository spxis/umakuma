import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { pendingGate } from "@/lib/uk/unLevelTestServer";

type RouteContext = { params: Promise<{ accountId: string }> };

/** Whether a test is waiting for this member, and which. */
export async function GET(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/level-test",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        return NextResponse.json({ gate: await pendingGate(accountId) });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not check for a test." }, { status: 500 });
      }
    },
  });
}
