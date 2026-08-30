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
  getSchoolGradeIndex,
  querySchoolGradeCatalog,
} from "@/lib/schoolGrades";
import type {
  SchoolGradeCategory,
  SchoolGradeSortBy,
  SchoolGradeSortDir,
} from "@/lib/schoolGrades.types";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  category: z.enum(["all", "elementary", "secondary", "name_kanji", "name_variant"]).default("all"),
  search: z.string().trim().max(100).optional(),
  strokeMin: z.coerce.number().int().min(1).max(64).optional(),
  strokeMax: z.coerce.number().int().min(1).max(64).optional(),
  sortBy: z.enum(["grade", "strokeCount", "frequency", "unicode", "kanji"]).default("grade"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  indexOnly: z.union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")]).optional(),
});

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/school-grades",
    method: "GET",
    request,
    execute: async () => {
      // 1. Rate Limiting Check
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:school-grades:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 120,
      });

      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      try {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          page: url.searchParams.get("page") ?? undefined,
          pageSize: url.searchParams.get("pageSize") ?? undefined,
          category: url.searchParams.get("category") ?? undefined,
          search: url.searchParams.get("search") ?? undefined,
          strokeMin: url.searchParams.get("strokeMin") ?? undefined,
          strokeMax: url.searchParams.get("strokeMax") ?? undefined,
          sortBy: url.searchParams.get("sortBy") ?? undefined,
          sortDir: url.searchParams.get("sortDir") ?? undefined,
          indexOnly: url.searchParams.get("indexOnly") ?? undefined,
        });

        if (!parsed.success) {
          const response = NextResponse.json(
            { error: "Invalid query parameters.", details: parsed.error.format() },
            { status: 400 },
          );
          return applyRateLimitHeaders(response, rateLimit);
        }

        // Return high-level summary index if requested
        if (parsed.data.indexOnly === "1" || parsed.data.indexOnly === "true") {
          const indexData = getSchoolGradeIndex();
          if (!indexData) {
            return NextResponse.json({ error: "Grade index not found." }, { status: 404 });
          }
          const response = NextResponse.json(indexData, {
            status: 200,
            headers: {
              "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
            },
          });
          return applyRateLimitHeaders(response, rateLimit);
        }

        // Return paginated/filtered kanji catalog across all grades
        const catalogResponse = querySchoolGradeCatalog({
          page: parsed.data.page,
          pageSize: parsed.data.pageSize,
          grade: "all",
          category: parsed.data.category as SchoolGradeCategory | "all",
          search: parsed.data.search ?? null,
          strokeMin: parsed.data.strokeMin ?? null,
          strokeMax: parsed.data.strokeMax ?? null,
          sortBy: parsed.data.sortBy as SchoolGradeSortBy,
          sortDir: parsed.data.sortDir as SchoolGradeSortDir,
        });

        const response = NextResponse.json(catalogResponse, {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
          },
        });

        return applyRateLimitHeaders(response, rateLimit);
      } catch (error) {
        console.error("[/api/school-grades] Error processing request:", error);
        return NextResponse.json(
          { error: "Internal server error." },
          { status: 500 },
        );
      }
    },
  });
}
