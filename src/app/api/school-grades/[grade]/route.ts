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
  getSchoolGradeFile,
  getSchoolGradeMeta,
  querySchoolGradeCatalog,
} from "@/lib/schoolGrades";
import type {
  SchoolGradeSortBy,
  SchoolGradeSortDir,
} from "@/lib/schoolGrades.types";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(100).optional(),
  strokeMin: z.coerce.number().int().min(1).max(64).optional(),
  strokeMax: z.coerce.number().int().min(1).max(64).optional(),
  sortBy: z.enum(["grade", "strokeCount", "frequency", "unicode", "kanji"]).default("grade"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  metaOnly: z.union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")]).optional(),
  all: z.union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false")]).optional(),
});

function parseGradeParam(param: string): number | null {
  const clean = param.replace(/^grade-?/i, "");
  const parsed = parseInt(clean, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 12) {
    return null;
  }
  return parsed;
}

export async function GET(
  request: Request,
  props: { params: Promise<{ grade: string }> },
) {
  return withApiRouteTelemetry({
    route: "/api/school-grades/[grade]",
    method: "GET",
    request,
    execute: async () => {
      // 1. Rate Limiter Check
      const clientIp = getClientIp(request);
      const rateLimit = checkRateLimit(`public:school-grade:${clientIp}`, {
        windowMs: 60 * 1000,
        maxRequests: 120,
      });

      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }

      try {
        const { grade: gradeParam } = await props.params;
        const grade = parseGradeParam(gradeParam);

        if (grade === null) {
          const response = NextResponse.json(
            { error: `Invalid grade '${gradeParam}'. Grade must be between 1 and 10.` },
            { status: 400 },
          );
          return applyRateLimitHeaders(response, rateLimit);
        }

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          page: url.searchParams.get("page") ?? undefined,
          pageSize: url.searchParams.get("pageSize") ?? undefined,
          search: url.searchParams.get("search") ?? undefined,
          strokeMin: url.searchParams.get("strokeMin") ?? undefined,
          strokeMax: url.searchParams.get("strokeMax") ?? undefined,
          sortBy: url.searchParams.get("sortBy") ?? undefined,
          sortDir: url.searchParams.get("sortDir") ?? undefined,
          metaOnly: url.searchParams.get("metaOnly") ?? undefined,
          all: url.searchParams.get("all") ?? undefined,
        });

        if (!parsed.success) {
          const response = NextResponse.json(
            { error: "Invalid query parameters.", details: parsed.error.format() },
            { status: 400 },
          );
          return applyRateLimitHeaders(response, rateLimit);
        }

        // Return only metadata header if requested
        if (parsed.data.metaOnly === "1" || parsed.data.metaOnly === "true") {
          const meta = getSchoolGradeMeta(grade);
          if (!meta) {
            return NextResponse.json({ error: `Grade ${grade} not found.` }, { status: 404 });
          }
          const response = NextResponse.json(meta, {
            status: 200,
            headers: {
              "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
            },
          });
          return applyRateLimitHeaders(response, rateLimit);
        }

        // Return full complete file payload if unpaginated `all=true` requested
        if (parsed.data.all === "1" || parsed.data.all === "true") {
          const fullFile = getSchoolGradeFile(grade);
          if (!fullFile) {
            return NextResponse.json({ error: `Grade ${grade} not found.` }, { status: 404 });
          }
          const response = NextResponse.json(fullFile, {
            status: 200,
            headers: {
              "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
            },
          });
          return applyRateLimitHeaders(response, rateLimit);
        }

        // Return paginated/filtered kanji list for this specific grade
        const catalogResponse = querySchoolGradeCatalog({
          page: parsed.data.page,
          pageSize: parsed.data.pageSize,
          grade,
          category: "all",
          search: parsed.data.search ?? null,
          strokeMin: parsed.data.strokeMin ?? null,
          strokeMax: parsed.data.strokeMax ?? null,
          sortBy: parsed.data.sortBy as SchoolGradeSortBy,
          sortDir: parsed.data.sortDir as SchoolGradeSortDir,
        });

        if (catalogResponse.items.length === 0 && !catalogResponse.meta) {
          const meta = getSchoolGradeMeta(grade);
          if (!meta) {
            return NextResponse.json({ error: `Grade ${grade} not found.` }, { status: 404 });
          }
        }

        const response = NextResponse.json(catalogResponse, {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
          },
        });

        return applyRateLimitHeaders(response, rateLimit);
      } catch (error) {
        console.error("[/api/school-grades/[grade]] Error:", error);
        return NextResponse.json(
          { error: "Internal server error." },
          { status: 500 },
        );
      }
    },
  });
}
