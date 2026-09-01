import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/apiRateLimit";
import {
  SENTENCE_LIMIT,
  SENTENCE_MAX_LIMIT,
  TATOEBA_ATTRIBUTION,
  fetchSentencesForKanji,
} from "@/lib/tatoebaSentences";

/**
 * Example sentences for one character.
 *
 * Public, like the catalogue search: the sentences belong to Tatoeba rather
 * than to any member, and every surface that shows a kanji can ask for them.
 * Unlike the static catalogues this one does reach the database, so it is rate
 * limited for the same reason the book-cover route is.
 */
const querySchema = z.object({
  kanji: z.string().min(1).max(8),
  limit: z.coerce.number().int().min(1).max(SENTENCE_MAX_LIMIT).optional(),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/sentences",
    method: "GET",
    request,
    execute: async () => {
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:sentences:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 90,
      });
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      const url = new URL(request.url);
      const parsed = querySchema.safeParse({
        kanji: url.searchParams.get("kanji") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
      });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      /* One character, whatever was sent: the index is keyed by character. */
      const character = [...parsed.data.kanji][0] ?? "";

      try {
        const sentences = await fetchSentencesForKanji(character, parsed.data.limit ?? SENTENCE_LIMIT);
        const response = NextResponse.json(
          { kanji: character, sentences, attribution: TATOEBA_ATTRIBUTION },
          { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
        );
        applyRateLimitHeaders(response, rateLimit);
        return response;
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load sentences." }, { status: 500 });
      }
    },
  });
}
