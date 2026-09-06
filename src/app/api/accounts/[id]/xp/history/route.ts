import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { parseXpHistoryQuery } from "@/lib/xp/xpHistoryQuery";
import { getXpHistoryPage } from "@/lib/xp/xpHistoryView";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * One page of a member's XP history.
 *
 * Sits under `/api/accounts/[id]` with the rest of an account's own resources
 * rather than inventing a third shape, and answers the same query string the
 * study history does - `page`, `pageSize`, `sortBy`, `sortDir`, plus `kind` -
 * so a member's two records are browsed the same way.
 *
 * Owner-only through `canAccessAccount`, which is the same gate the theme
 * route uses. What somebody earned and when is theirs.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/xp/history",
    method: "GET",
    request,
    execute: async () => {
      if (!(await canAccessAccount(request, id))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const query = parseXpHistoryQuery(new URL(request.url));
      return NextResponse.json(await getXpHistoryPage({ ...query, accountId: id }));
    },
  });
}
