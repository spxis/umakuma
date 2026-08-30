import { NextResponse } from "next/server";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
} from "@/lib/apiRateLimit";
import {
  getSchoolGradeKanjiByCharacter,
  getSchoolGradeMeta,
} from "@/lib/schoolGrades";

export async function GET(
  request: Request,
  props: { params: Promise<{ character: string }> },
) {
  return withApiRouteTelemetry({
    route: "/api/school-grades/kanji/[character]",
    method: "GET",
    request,
    execute: async () => {
      // 1. Rate Limiter Check
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:school-grade-kanji:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 180,
      });

      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      try {
        const { character: rawParam } = await props.params;
        const char = decodeURIComponent(rawParam).trim();

        if (!char || Array.from(char).length !== 1) {
          const response = NextResponse.json(
            { error: "Must specify exactly one Kanji character." },
            { status: 400 },
          );
          return applyRateLimitHeaders(response, rateLimit);
        }

        const entry = getSchoolGradeKanjiByCharacter(char);

        if (!entry) {
          const response = NextResponse.json(
            {
              error: `Kanji '${char}' is not found in the Elementary/Secondary School Grade catalog.`,
              kanji: char,
              found: false,
            },
            { status: 404 },
          );
          return applyRateLimitHeaders(response, rateLimit);
        }

        const gradeMeta = getSchoolGradeMeta(entry.grade);

        const response = NextResponse.json(
          {
            found: true,
            kanji: entry,
            gradeMeta,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
            },
          },
        );

        return applyRateLimitHeaders(response, rateLimit);
      } catch (error) {
        console.error("[/api/school-grades/kanji/[character]] Error:", error);
        return NextResponse.json(
          { error: "Internal server error." },
          { status: 500 },
        );
      }
    },
  });
}
