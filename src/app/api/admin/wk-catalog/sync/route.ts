import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isAuthorizedAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { clearCatalogBrowseCache } from "@/lib/wanikani/catalogBrowseCache";
import { runCatalogSync } from "@/lib/wanikani/catalogSync";

const syncRequestSchema = z.object({
  runType: z.enum(["full", "incremental"]),
  mode: z.enum(["dry-run", "apply"]).default("apply"),
});

const MAX_PAGES_BY_RUN_TYPE: Record<"full" | "incremental", number> = {
  full: 2,
  incremental: 5,
};

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/wk-catalog/sync",
    method: "POST",
    request,
    execute: async () => {
      try {
        const parsed = syncRequestSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const runType = parsed.data.runType;
        const mode = parsed.data.mode;

        const result = await runCatalogSync({
          mode: runType,
          apply: mode === "apply",
          resume: true,
          maxPages: mode === "dry-run" ? 1 : MAX_PAGES_BY_RUN_TYPE[runType],
          accountLike: "john",
        });

        if (mode === "apply") {
          clearCatalogBrowseCache();
        }

        const state = await prisma.wkCatalogSyncState.findUnique({
          where: { id: "global" },
          select: {
            isSyncing: true,
            lastStatus: true,
            lastError: true,
          },
        });

        return NextResponse.json(
          {
            ok: true,
            mode,
            runType,
            summary: {
              pagesProcessed: result.pagesProcessed,
              fetchedCount: result.fetchedCount,
              upsertedCount: result.upsertedCount,
              changedCount: result.changedCount,
              skippedCount: result.skippedCount,
              parseErrorCount: result.parseErrorCount,
            },
            state: state
              ? {
                  status: state.lastStatus,
                  isSyncing: state.isSyncing,
                  lastError: state.lastError,
                }
              : undefined,
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not run catalog sync." }, { status: 500 });
      }
    },
  });
}
