import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/apiRateLimit";
import { isSearchable, normalizeQuery, parseSources } from "@/lib/globalSearch";
import { runGlobalSearch } from "@/lib/globalSearchServer";

const querySchema = z.object({
  q: z.string().max(64).optional(),
  sources: z.string().max(120).optional(),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/search",
    method: "GET",
    request,
    execute: async () => {
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:search:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 90,
      });
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      const url = new URL(request.url);
      const parsed = querySchema.safeParse({
        q: url.searchParams.get("q") ?? undefined,
        sources: url.searchParams.get("sources") ?? undefined,
      });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const query = normalizeQuery(parsed.data.q);
      if (!isSearchable(query)) {
        return NextResponse.json({
          query,
          totalHits: 0,
          countsBySource: { wanikani: 0, jlpt: 0, grades: 0 },
          hits: [],
        });
      }

      try {
        const results = await runGlobalSearch(query, parseSources(parsed.data.sources));
        const response = NextResponse.json(results, {
          headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
        });
        applyRateLimitHeaders(response, rateLimit);
        return response;
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not run that search." }, { status: 500 });
      }
    },
  });
}
