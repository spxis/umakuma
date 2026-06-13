import { NextResponse } from "next/server";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { isAuthorizedAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const EXPECTED_LEVEL_COUNT = 60;

function rangeInclusive(start: number, end: number): number[] {
  const output: number[] = [];
  for (let index = start; index <= end; index += 1) {
    output.push(index);
  }
  return output;
}

export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/wk-catalog/status",
    method: "GET",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const [state, byTypeRows, byLevelRows, duplicateRows, latestRuns] = await Promise.all([
          prisma.wkCatalogSyncState.findUnique({
            where: { id: "global" },
            select: {
              isSyncing: true,
              lastStatus: true,
              lastError: true,
              lastFullSyncCompletedAt: true,
              lastIncrementalSyncCompletedAt: true,
              lastCursorDataUpdatedAt: true,
              lastCursorSubjectId: true,
              updatedAt: true,
            },
          }),
          prisma.wkSubjectCatalog.groupBy({
            by: ["subjectType"],
            _count: { _all: true },
          }),
          prisma.wkSubjectCatalog.groupBy({
            by: ["level"],
            _count: { _all: true },
            orderBy: { level: "asc" },
          }),
          prisma.wkSubjectCatalog.groupBy({
            by: ["wkSubjectId"],
            _count: { _all: true },
            having: {
              wkSubjectId: {
                _count: {
                  gt: 1,
                },
              },
            },
          }),
          prisma.wkCatalogSyncRun.findMany({
            orderBy: { startedAt: "desc" },
            take: 12,
            select: {
              id: true,
              runType: true,
              status: true,
              startedAt: true,
              completedAt: true,
              durationMs: true,
              fetchedCount: true,
              upsertedCount: true,
              changedCount: true,
              errorCount: true,
              errorMessage: true,
            },
          }),
        ]);

        const byType = {
          radical: byTypeRows.find((row) => row.subjectType === "radical")?._count._all ?? 0,
          kanji: byTypeRows.find((row) => row.subjectType === "kanji")?._count._all ?? 0,
          vocabulary: byTypeRows.find((row) => row.subjectType === "vocabulary")?._count._all ?? 0,
        };

        const levelsPresent = byLevelRows.map((row) => row.level).filter((level): level is number => typeof level === "number");
        const expectedLevels = new Set(rangeInclusive(1, EXPECTED_LEVEL_COUNT));
        const presentLevelSet = new Set(levelsPresent);

        const missingLevels = Array.from(expectedLevels.values()).filter((level) => !presentLevelSet.has(level));
        const extraLevels = levelsPresent.filter((level) => !expectedLevels.has(level));

        const totalSubjects = byLevelRows.reduce((sum, row) => sum + row._count._all, 0);

        return NextResponse.json(
          {
            now: new Date().toISOString(),
            counts: {
              totalSubjects,
              levels: levelsPresent.length,
              byType,
            },
            expected: {
              levels: EXPECTED_LEVEL_COUNT,
            },
            drift: {
              missingLevels,
              extraLevels,
              duplicateSubjectRows: duplicateRows.length,
            },
            state: state
              ? {
                  isSyncing: state.isSyncing,
                  lastStatus: state.lastStatus,
                  lastError: state.lastError,
                  lastFullSyncCompletedAt: state.lastFullSyncCompletedAt?.toISOString() ?? null,
                  lastIncrementalSyncCompletedAt: state.lastIncrementalSyncCompletedAt?.toISOString() ?? null,
                  lastCursorDataUpdatedAt: state.lastCursorDataUpdatedAt?.toISOString() ?? null,
                  lastCursorSubjectId: state.lastCursorSubjectId,
                  updatedAt: state.updatedAt.toISOString(),
                }
              : {
                  isSyncing: false,
                  lastStatus: "idle",
                  lastError: null,
                  lastFullSyncCompletedAt: null,
                  lastIncrementalSyncCompletedAt: null,
                  lastCursorDataUpdatedAt: null,
                  lastCursorSubjectId: null,
                  updatedAt: new Date(0).toISOString(),
                },
            latestRuns: latestRuns.map((run) => ({
              ...run,
              startedAt: run.startedAt.toISOString(),
              completedAt: run.completedAt?.toISOString() ?? null,
            })),
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load catalog status." }, { status: 500 });
      }
    },
  });
}
