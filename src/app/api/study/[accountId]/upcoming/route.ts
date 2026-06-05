import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { fetchAllCollectionPages, fetchWaniKani } from "@/lib/wanikani/http";
import type { WaniKaniSummaryResponse } from "@/lib/wanikani/types";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

type SummaryReviewGroup = {
  available_at: string;
  subject_ids: number[];
};

type UpcomingReviewItem = {
  subjectId: number;
  subjectType: "radical" | "kanji" | "vocabulary";
  wkLevel: number | null;
  characters: string;
  primaryMeaning: string | null;
  primaryReading: string | null;
  availableAt: string;
};

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

function normalizeSubjectType(input: string): UpcomingReviewItem["subjectType"] {
  if (input === SUBJECT_TYPES.radical || input === SUBJECT_TYPES.kanji) {
    return input;
  }

  return SUBJECT_TYPES.vocabulary;
}

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/upcoming",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          limit: url.searchParams.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const limit = parsed.data.limit ?? 8;

        const account = await prisma.account.findUnique({
          where: { id: accountId },
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

        const summaryResponse = await fetchWaniKani<WaniKaniSummaryResponse>("/summary", token);
        const summary = summaryResponse.data;
        if (!summary) {
          return NextResponse.json({ error: "Could not fetch upcoming study reviews." }, { status: 502 });
        }

        const nowMs = Date.now();
        const futureGroups = summary.data.reviews
          .filter((group) => Date.parse(group.available_at) > nowMs)
          .sort((a, b) => Date.parse(a.available_at) - Date.parse(b.available_at));

        const totalUpcoming = futureGroups.reduce((sum, group) => sum + group.subject_ids.length, 0);

        const seenSubjectIds = new Set<number>();
        const summaryRows: Array<{ subjectId: number; availableAt: string }> = [];
        for (const group of futureGroups as SummaryReviewGroup[]) {
          for (const subjectId of group.subject_ids) {
            if (seenSubjectIds.has(subjectId)) {
              continue;
            }

            seenSubjectIds.add(subjectId);
            summaryRows.push({ subjectId, availableAt: group.available_at });
            if (summaryRows.length >= limit) {
              break;
            }
          }

          if (summaryRows.length >= limit) {
            break;
          }
        }

        if (summaryRows.length === 0) {
          return NextResponse.json(
            {
              items: [] satisfies UpcomingReviewItem[],
              totalUpcoming,
            },
            { status: 200 },
          );
        }

        const subjectCollection = await fetchAllCollectionPages(
          `/subjects?ids=${summaryRows.map((row) => row.subjectId).join(",")}`,
          token,
        );
        const subjectById = new Map(subjectCollection.data.map((row) => [row.id, row]));

        const items = summaryRows
          .map((row): UpcomingReviewItem | null => {
            const subjectRow = subjectById.get(row.subjectId);
            if (!subjectRow) {
              return null;
            }

            const data = subjectRow.data as {
              level?: number;
              characters?: string | null;
              slug?: string | null;
              meanings?: Array<{ meaning: string; primary?: boolean }>;
              readings?: Array<{ reading: string; primary?: boolean; accepted_answer?: boolean }>;
            };

            const primaryMeaning =
              data.meanings?.find((meaning) => meaning.primary ?? true)?.meaning ??
              data.meanings?.[0]?.meaning ??
              null;
            const primaryReading =
              data.readings?.find((reading) => reading.primary && (reading.accepted_answer ?? true))?.reading ??
              data.readings?.find((reading) => reading.accepted_answer ?? true)?.reading ??
              null;

            return {
              subjectId: row.subjectId,
              subjectType: normalizeSubjectType(subjectRow.object ?? ""),
              wkLevel: typeof data.level === "number" ? data.level : null,
              characters: data.characters ?? data.slug ?? `#${row.subjectId}`,
              primaryMeaning,
              primaryReading,
              availableAt: row.availableAt,
            };
          })
          .filter((item): item is UpcomingReviewItem => item !== null);

        return NextResponse.json(
          {
            items,
            totalUpcoming,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
            },
          },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not fetch upcoming study reviews." }, { status: 500 });
      }
    },
  });
}
