import { NextResponse } from "next/server";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isAuthorizedAdmin } from "@/lib/admin";
import { buildCatalogGapReport } from "@/lib/wanikani/catalogGapReport";
import { findCatalogGap } from "@/lib/wanikani/catalogGap";

/**
 * What the catalogue cannot answer for, measured on demand.
 *
 * Its own route rather than a field on `/status` because the measurement is
 * expensive in a way that status is not: it reads every account's assignment
 * cache and the relation arrays of all nine thousand held rows. The panel polls
 * status; it must never poll this. A click asks, and nothing else does.
 */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/wk-catalog/gap",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const gap = await findCatalogGap();

        return NextResponse.json(buildCatalogGapReport(gap, new Date()), { status: 200 });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not measure the catalogue gap." }, { status: 500 });
      }
    },
  });
}
