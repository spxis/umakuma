import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { startPlacement } from "@/lib/uk/placementServer";

type RouteContext = { params: Promise<{ accountId: string }> };

/**
 * Opens a placement test.
 *
 * A POST rather than a GET because it hands out a signed ticket, and because
 * the very first thing it could do — for a ladder with no rung 5 to ask — is
 * write a floor. Nothing is stored otherwise: the ticket is the test.
 */
export async function POST(request: Request, context: RouteContext) {
  const { accountId } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/uk-study/[accountId]/placement/start",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const step = await startPlacement(accountId);
        if (!step) {
          return NextResponse.json({ error: "There is nothing to place you with yet." }, { status: 409 });
        }

        return NextResponse.json(step, { headers: { "Cache-Control": "private, no-store" } });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not start the placement test." }, { status: 500 });
      }
    },
  });
}
