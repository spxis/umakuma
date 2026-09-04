import { NextResponse } from "next/server";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { SOURCE_KEY_VALUES } from "@/lib/sourceCredits";
import { loadSourceReport } from "@/lib/sourcePage";
import type { SourceReport } from "@/lib/sourceReport";

/**
 * Every source at once, read fresh.
 *
 * Deliberately `loadSourceReport` and not the cached reader the public pages
 * use. An admin opens this after triggering a sync, and a ten-minute-old count
 * would answer the question they are asking with the number from before they
 * asked it.
 *
 * `allSettled`, so one source cannot take the console down: a table missing on
 * an environment, or a file a script has not written yet, should leave a gap in
 * one row rather than an error page over twelve.
 */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/sources",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const settled = await Promise.allSettled(SOURCE_KEY_VALUES.map((key) => loadSourceReport(key)));
        const sources: SourceReport[] = [];
        const failed: string[] = [];
        settled.forEach((result, index) => {
          if (result.status === "fulfilled") sources.push(result.value);
          else failed.push(SOURCE_KEY_VALUES[index]);
        });

        return NextResponse.json({ sources, failed });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load the sources." }, { status: 500 });
      }
    },
  });
}
