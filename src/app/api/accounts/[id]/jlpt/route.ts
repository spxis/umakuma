import { NextResponse } from "next/server";
import { z } from "zod";

import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getUserKanjiIndex } from "@/lib/wanikani";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const routeParamsSchema = z.object({
  id: z.string().min(1),
});

const routeQuerySchema = z.object({
  includeItems: z.enum(["0", "1"]).optional(),
  includeUserIndex: z.enum(["0", "1"]).optional(),
  includeSummary: z.enum(["0", "1"]).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export async function GET(_: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/accounts/[id]/jlpt",
    method: "GET",
    request: _,
    execute: async () => {
      try {
        const requestUrl = new URL(_.url);
        const parsedParams = routeParamsSchema.safeParse(await context.params);
        if (!parsedParams.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const parsedQuery = routeQuerySchema.safeParse({
          includeItems: requestUrl.searchParams.get("includeItems") ?? undefined,
          includeUserIndex: requestUrl.searchParams.get("includeUserIndex") ?? undefined,
          includeSummary: requestUrl.searchParams.get("includeSummary") ?? undefined,
          limit: requestUrl.searchParams.get("limit") ?? undefined,
          offset: requestUrl.searchParams.get("offset") ?? undefined,
        });
        if (!parsedQuery.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const includeItems = parsedQuery.data.includeItems !== "0";
        const includeUserIndex = parsedQuery.data.includeUserIndex !== "0";
        const includeSummary = parsedQuery.data.includeSummary !== "0";
        const limitParam = Number(parsedQuery.data.limit ?? "");
        const offsetParam = Number(parsedQuery.data.offset ?? "");
        const limit = Number.isInteger(limitParam) && limitParam >= 0 ? Math.min(limitParam, 500) : null;
        const offset = Number.isInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

        const { id } = parsedParams.data;

        const account = await prisma.account.findUnique({
          where: { id },
          select: {
            tokenEncrypted: true,
            tokenIv: true,
            tokenTag: true,
          },
        });

        if (!account) {
          return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        const token = decryptToken({
          encrypted: account.tokenEncrypted,
          iv: account.tokenIv,
          tag: account.tokenTag,
        });

        const [userKanjiItems, jlptItems, jlptTotal, jlptSummaryRows] = await Promise.all([
          includeUserIndex ? getUserKanjiIndex(token) : Promise.resolve([]),
          includeItems
            ? prisma.jlptKanji.findMany({
                orderBy: [{ nLevel: "asc" }, { kanji: "asc" }],
                ...(limit === null ? {} : { skip: offset, take: limit }),
                select: {
                  kanji: true,
                  nLevel: true,
                  strokeCount: true,
                  frequencyRank: true,
                  schoolGrade: true,
                  heisigKeyword: true,
                  unicodeHex: true,
                  sourceJlpt: true,
                  primaryMeaning: true,
                  meanings: true,
                  onReadings: true,
                  kunReadings: true,
                  nanoriReadings: true,
                  notes: true,
                  wordExamples: true,
                },
              })
            : Promise.resolve([]),
          includeItems || includeSummary ? prisma.jlptKanji.count() : Promise.resolve(0),
          includeSummary
            ? prisma.jlptKanji.findMany({
                select: {
                  kanji: true,
                  nLevel: true,
                  schoolGrade: true,
                },
              })
            : Promise.resolve([]),
        ]);

        const nLevelCounts = { n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 };
        const wkLevelCounts: Record<string, number> = {};
        const gradeCounts: Record<string, number> = {};
        if (includeSummary) {
          const userByCharacter = new Map(userKanjiItems.map((item) => [item.characters, item] as const));

          for (const row of jlptSummaryRows) {
            if (row.nLevel === 1) nLevelCounts.n1 += 1;
            if (row.nLevel === 2) nLevelCounts.n2 += 1;
            if (row.nLevel === 3) nLevelCounts.n3 += 1;
            if (row.nLevel === 4) nLevelCounts.n4 += 1;
            if (row.nLevel === 5) nLevelCounts.n5 += 1;

            const gradeKey = row.schoolGrade === null ? "none" : String(row.schoolGrade);
            gradeCounts[gradeKey] = (gradeCounts[gradeKey] ?? 0) + 1;

            const wkLevel = userByCharacter.get(row.kanji)?.wkLevel;
            const wkLevelKey = typeof wkLevel === "number" ? String(wkLevel) : "none";
            wkLevelCounts[wkLevelKey] = (wkLevelCounts[wkLevelKey] ?? 0) + 1;
          }
        }

        return NextResponse.json({
          jlptItems,
          userKanjiItems,
          summary: includeSummary
            ? {
                total: jlptTotal,
                nLevelCounts,
                wkLevelCounts,
                gradeCounts,
              }
            : null,
          pagination: {
            offset,
            limit: limit ?? jlptItems.length,
            total: jlptTotal,
            hasMore: includeItems && limit !== null ? offset + limit < jlptTotal : false,
          },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load JLPT explorer data." }, { status: 500 });
      }
    },
  });
}
