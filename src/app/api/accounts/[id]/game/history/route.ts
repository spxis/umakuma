import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { parseGameHistoryQuery } from "@/lib/gameHistoryQuery";
import { getGameHistoryPage } from "@/lib/gameHistoryView";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * One page of a member's game history.
 *
 * Sits under `/api/accounts/[id]` beside the XP history rather than under
 * `/api/game/[accountId]`, which is where a game is *played* - started,
 * answered, completed. This is a member's record of what they played, and it
 * is browsed with the same query string as their other two records: `page`,
 * `pageSize`, `sortBy`, `sortDir`, plus `kind`.
 *
 * Owner-only through `canAccessAccount`. A run's score is on the public
 * scoreboard, but what somebody played and when - and what it paid them - is
 * theirs.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/game/history",
    method: "GET",
    request,
    execute: async () => {
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const query = parseGameHistoryQuery(new URL(request.url));
      return NextResponse.json(await getGameHistoryPage({ ...query, accountId: id }));
    },
  });
}
