import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getCatalogBrowseData } from "@/lib/wanikani/catalogBrowse";
import {
  getCachedCatalogBrowse,
  getCatalogBrowseCacheTtlMs,
  setCachedCatalogBrowse,
} from "@/lib/wanikani/catalogBrowseCache";
import {
  CATALOG_CATEGORY_FILTERS,
  CATALOG_SORT_BY,
  CATALOG_SORT_DIR,
  CATALOG_SUBJECT_TYPE_FILTERS,
  type CatalogBrowseQuery,
  type CatalogBrowseResponse,
} from "@/lib/wanikani/catalogBrowseTypes";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  type: z.enum(CATALOG_SUBJECT_TYPE_FILTERS).default("all"),
  category: z.enum(CATALOG_CATEGORY_FILTERS).default("all"),
  levelMin: z.union([z.literal(""), z.undefined(), z.coerce.number().int().min(1).max(60)]).optional(),
  levelMax: z.union([z.literal(""), z.undefined(), z.coerce.number().int().min(1).max(60)]).optional(),
  sortBy: z.enum(CATALOG_SORT_BY).default("level"),
  sortDir: z.enum(CATALOG_SORT_DIR).default("asc"),
  search: z.union([z.literal(""), z.undefined(), z.string().trim().min(1).max(80)]).optional(),
});

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
};

function toOptionalInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toOptionalSearch(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildQuery(url: URL): CatalogBrowseQuery | null {
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    levelMin: url.searchParams.get("levelMin") ?? undefined,
    levelMax: url.searchParams.get("levelMax") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortDir: url.searchParams.get("sortDir") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return null;
  }

  const levelA = toOptionalInt(parsed.data.levelMin);
  const levelB = toOptionalInt(parsed.data.levelMax);

  const normalizedLevelMin = levelA !== null && levelB !== null ? Math.min(levelA, levelB) : levelA;
  const normalizedLevelMax = levelA !== null && levelB !== null ? Math.max(levelA, levelB) : levelB;

  return {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    type: parsed.data.type,
    category: parsed.data.category,
    levelMin: normalizedLevelMin,
    levelMax: normalizedLevelMax,
    sortBy: parsed.data.sortBy,
    sortDir: parsed.data.sortDir,
    search: toOptionalSearch(parsed.data.search),
  };
}

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/wk-catalog/subjects",
    method: "GET",
    request,
    execute: async () => {
      try {
        const url = new URL(request.url);
        const query = buildQuery(url);
        if (!query) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const cacheKey = JSON.stringify(query);
        const cached = getCachedCatalogBrowse(cacheKey);
        if (cached) {
          const cachedPayload: CatalogBrowseResponse = {
            ...cached,
            meta: {
              ...cached.meta,
              cacheHit: true,
            },
          };

          return NextResponse.json(cachedPayload, {
            status: 200,
            headers: CACHE_HEADERS,
          });
        }

        const payloadWithoutMeta = await getCatalogBrowseData(query);
        const payload: CatalogBrowseResponse = {
          ...payloadWithoutMeta,
          meta: {
            cacheHit: false,
            cacheTtlMs: getCatalogBrowseCacheTtlMs(),
            generatedAt: new Date().toISOString(),
          },
        };

        setCachedCatalogBrowse(cacheKey, payload);

        return NextResponse.json(payload, {
          status: 200,
          headers: CACHE_HEADERS,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load catalog subjects." }, { status: 500 });
      }
    },
  });
}
