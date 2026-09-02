import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/apiRateLimit";
import { SEARCH_MAX_WINDOW, isSearchable, normalizeQuery, parseSources } from "@/lib/globalSearch";
import { isSearchKind } from "@/lib/searchKinds";
import { runGlobalSearch } from "@/lib/globalSearchServer";
import { resolveSearchAnswers } from "@/lib/searchAnswersServer";

const querySchema = z.object({
  q: z.string().max(64).optional(),
  sources: z.string().max(120).optional(),
  /* Words, kanji or radicals; absent means all three. */
  kind: z.string().max(20).optional(),
  /* One window of the ranked answer; absent means the whole of it. */
  limit: z.coerce.number().int().min(1).max(SEARCH_MAX_WINDOW).optional(),
  offset: z.coerce.number().int().min(0).max(SEARCH_MAX_WINDOW).optional(),
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
        kind: url.searchParams.get("kind") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
      });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const query = normalizeQuery(parsed.data.q);
      if (!isSearchable(query)) {
        return NextResponse.json({
          query,
          totalHits: 0,
          countsBySource: { wanikani: 0, jlpt: 0, grades: 0, dictionary: 0 },
          countsByKind: { words: 0, kanji: 0, radicals: 0 },
          hits: [],
          answers: [],
        });
      }

      /* An unknown kind is not an error; it is a link somebody edited by hand. */
      const kind =
        parsed.data.kind && isSearchKind(parsed.data.kind) ? parsed.data.kind : null;

      try {
        /*
         * Together, because neither waits on the other: the catalogues are a
         * database read and an answer is arithmetic over a cached rate table.
         * No history here - the dropdown has no room for the table, and asking
         * for it would turn one cached request into six on every keystroke.
         */
        const [results, answers] = await Promise.all([
          runGlobalSearch(query, parseSources(parsed.data.sources), {
            limit: parsed.data.limit,
            offset: parsed.data.offset,
            kind,
          }),
          resolveSearchAnswers(query, { history: false }),
        ]);
        const response = NextResponse.json({ ...results, answers }, {
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
