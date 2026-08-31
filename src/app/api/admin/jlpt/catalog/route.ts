import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  getCachedJlptCatalog,
  getJlptCatalogCacheTtlMs,
  setCachedJlptCatalog,
} from "@/lib/jlptCatalogCache";
import {
  type JlptCatalogJsonSourceMeta,
  type JlptCatalogQuery,
  type JlptCatalogResponse,
} from "@/lib/jlptCatalogTypes";
import {
  buildCatalogOrderBy,
  buildCatalogWhere,
  isDownloadRequest,
  MISSING_ENRICHMENT_WHERE,
  toCatalogQuery,
} from "@/lib/jlptCatalogQuery";
import { prisma } from "@/lib/prisma";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
};

async function getJsonSourceMeta(): Promise<JlptCatalogJsonSourceMeta> {
  const filePath = path.resolve(process.cwd(), "src/data/jlptReadings.json");
  const defaultMeta: JlptCatalogJsonSourceMeta = {
    path: "src/data/jlptReadings.json",
    generatedBy: "scripts/build-jlpt-readings.mjs",
    updatedAt: null,
    entryCount: 0,
    refreshHint: "Refresh when kanjiapi.dev data changes or after JLPT schema updates.",
  };

  try {
    const [stats, fileText] = await Promise.all([
      fs.stat(filePath),
      fs.readFile(filePath, "utf8"),
    ]);

    const parsed = JSON.parse(fileText) as Record<string, unknown>;

    return {
      ...defaultMeta,
      updatedAt: stats.mtime.toISOString(),
      entryCount: Object.keys(parsed).length,
    };
  } catch {
    return defaultMeta;
  }
}

async function buildCatalogResponse(query: JlptCatalogQuery): Promise<JlptCatalogResponse> {
  const where = buildCatalogWhere(query);
  const orderBy = buildCatalogOrderBy(query);

  const [totalRows, filteredRows, missingEnrichmentRows, byLevelRows, jsonSource] = await Promise.all([
    prisma.jlptKanji.count(),
    prisma.jlptKanji.count({ where }),
    prisma.jlptKanji.count({ where: MISSING_ENRICHMENT_WHERE }),
    prisma.jlptKanji.groupBy({
      by: ["nLevel"],
      _count: { _all: true },
    }),
    getJsonSourceMeta(),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows / query.pageSize));
  const page = Math.min(query.page, totalPages);

  const rows = await prisma.jlptKanji.findMany({
    where,
    orderBy,
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      kanji: true,
      nLevel: true,
      primaryMeaning: true,
      meanings: true,
      onReadings: true,
      kunReadings: true,
      nanoriReadings: true,
      strokeCount: true,
      frequencyRank: true,
      sourceJlpt: true,
      enrichedAt: true,
      updatedAt: true,
    },
  });

  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of byLevelRows) {
    byLevel[row.nLevel] = row._count._all;
  }

  return {
    now: new Date().toISOString(),
    query: {
      ...query,
      page,
    },
    summary: {
      totalRows,
      filteredRows,
      missingEnrichmentRows,
      byLevel,
    },
    pagination: {
      page,
      pageSize: query.pageSize,
      total: filteredRows,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    items: rows.map((row) => ({
      kanji: row.kanji,
      nLevel: row.nLevel,
      primaryMeaning: row.primaryMeaning,
      meaningsCount: row.meanings.length,
      onReadingsCount: row.onReadings.length,
      kunReadingsCount: row.kunReadings.length,
      nanoriReadingsCount: row.nanoriReadings.length,
      strokeCount: row.strokeCount,
      frequencyRank: row.frequencyRank,
      sourceJlpt: row.sourceJlpt,
      enrichedAt: row.enrichedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
    jsonSource,
    meta: {
      cacheHit: false,
      cacheTtlMs: getJlptCatalogCacheTtlMs(),
      generatedAt: new Date().toISOString(),
      destructive: false,
    },
  };
}

function toDownloadFilename(query: JlptCatalogQuery): string {
  const parts = ["jlpt-catalog"];
  if (query.nLevel !== null) {
    parts.push(`n${query.nLevel}`);
  }
  if (query.enrichment !== "all") {
    parts.push(query.enrichment);
  }
  if (query.search) {
    parts.push("search");
  }

  return `${parts.join("-")}-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/jlpt/catalog",
    method: "GET",
    request,
    execute: async () => {
      try {
        const url = new URL(request.url);
        const query = toCatalogQuery(url);
        if (!query) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const download = isDownloadRequest(url);
        const cacheKey = JSON.stringify(query);

        let payload = getCachedJlptCatalog(cacheKey);
        if (!payload) {
          payload = await buildCatalogResponse(query);
          setCachedJlptCatalog(cacheKey, payload);
        } else {
          payload = {
            ...payload,
            meta: {
              ...payload.meta,
              cacheHit: true,
            },
          };
        }

        if (download) {
          const downloadBody = JSON.stringify(payload, null, 2);
          return new NextResponse(downloadBody, {
            status: 200,
            headers: {
              ...CACHE_HEADERS,
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="${toDownloadFilename(query)}"`,
            },
          });
        }

        return NextResponse.json(payload, {
          status: 200,
          headers: CACHE_HEADERS,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load JLPT catalog." }, { status: 500 });
      }
    },
  });
}
