import { NextResponse } from "next/server";
import { z } from "zod";

import { applyRateLimitHeaders, checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/apiRateLimit";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { runRadicalSearch } from "@/lib/radicalSearchServer";

const querySchema = z.object({
  /* The chosen radicals, comma-separated. Absent means the empty grid. */
  radicals: z.string().max(400).optional(),
});

/**
 * The radical grid, and what the chosen radicals narrow it to.
 *
 * One route rather than two, because the grid and the answer are one screen: a
 * pick changes both the matches and which radicals are still worth offering,
 * and asking for them separately would draw a grid that disagrees with its own
 * results for a moment.
 */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/radicals",
    method: "GET",
    request,
    execute: async () => {
      const rateLimit = checkRateLimit(`public:radicals:${getClientIp(request)}`, {
        windowMs: 60 * 1000,
        maxRequests: 120,
      });
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      const url = new URL(request.url);
      const parsed = querySchema.safeParse({ radicals: url.searchParams.get("radicals") ?? undefined });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const chosen = (parsed.data.radicals ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const response = NextResponse.json(runRadicalSearch(chosen));
      applyRateLimitHeaders(response, rateLimit);
      return response;
    },
  });
}
