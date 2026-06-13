import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

const JLPT_ENRICH_BATCH_SIZE = 250;
const querySchema = z.object({});

function estimateRefreshAllMinutes(accountsTotal: number): number {
  return Math.max(1, Math.ceil(accountsTotal / 8));
}

function estimateFullCatalogSyncMinutes(subjectTotal: number): number {
  return Math.max(2, Math.ceil(subjectTotal / 500));
}

function estimateIncrementalSyncMinutes(): number {
  return 1;
}

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/operations-scope",
    method: "GET",
    request,
    execute: async () => {
      try {
        const parsed = querySchema.safeParse({});
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const [accountsTotal, wkCatalogTotal, jlptTotal, jlptMissingEnrichment] = await Promise.all([
          prisma.account.count(),
          prisma.wkSubjectCatalog.count(),
          prisma.jlptKanji.count(),
          prisma.jlptKanji.count({
            where: {
              OR: [
                { enrichedAt: null },
                { meanings: { isEmpty: true } },
                { strokeCount: null },
                { heisigKeyword: null },
              ],
            },
          }),
        ]);

        const jlptEnrichRemainingBatches = Math.ceil(jlptMissingEnrichment / JLPT_ENRICH_BATCH_SIZE);

        return NextResponse.json(
          {
            generatedAt: new Date().toISOString(),
            counts: {
              accountsTotal,
              wkCatalogTotal,
              jlptTotal,
              jlptMissingEnrichment,
            },
            estimates: {
              refreshAllMinutes: estimateRefreshAllMinutes(accountsTotal),
              jlptRefreshMinutes: 1,
              jlptEnrichBatchSize: JLPT_ENRICH_BATCH_SIZE,
              jlptEnrichRemainingBatches,
              fullCatalogSyncMinutes: estimateFullCatalogSyncMinutes(wkCatalogTotal),
              incrementalCatalogSyncMinutes: estimateIncrementalSyncMinutes(),
            },
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load operation scope." }, { status: 500 });
      }
    },
  });
}
