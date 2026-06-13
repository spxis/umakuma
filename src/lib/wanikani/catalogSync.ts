import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { fetchWaniKani } from "./http";
import type { WaniKaniCollectionResponse } from "./types";
import {
  DEFAULT_ACCOUNT_MATCH,
  DEFAULT_SUBJECTS_PATH,
  GLOBAL_STATE_ID,
  lockDurationMsForMode,
} from "./catalogSync.constants";
import {
  buildUpdatedAfterPath,
  extractNextPath,
  nowPlus,
  parseFullResumePath,
  parseIncrementalResumePath,
  parseSubjectRow,
  updateCursor,
} from "./catalogSync.helpers";
import { resolveCatalogSyncToken } from "./catalogSync.token";
import type {
  CatalogSyncResult,
  RunCatalogSyncOptions,
  SubjectUpsertRow,
  ProgressStats,
} from "./catalogSync.types";

export async function runCatalogSync(options: RunCatalogSyncOptions): Promise<CatalogSyncResult> {
  const mode = options.mode;
  const apply = options.apply ?? true;
  const resume = options.resume ?? true;
  const maxPages = options.maxPages ?? null;
  const accountLike = options.accountLike ?? DEFAULT_ACCOUNT_MATCH;

  const tokenResult = await resolveCatalogSyncToken({ token: options.token, accountLike });
  if (!tokenResult) {
    throw new Error(
      `Missing token. Set WK_CATALOG_API_TOKEN/WANIKANI_API_TOKEN, pass token, or ensure a matching account exists for accountLike=${accountLike}.`,
    );
  }

  const lockMs = lockDurationMsForMode(mode);
  const startedAtMs = Date.now();

  let pagesProcessed = 0;
  let fetchedCount = 0;
  let upsertedCount = 0;
  let changedCount = 0;
  let skippedCount = 0;
  let parseErrorCount = 0;
  let runId: string | null = null;
  let claimedLock = false;
  let cursorDataUpdatedAt: Date | null = null;
  let cursorSubjectId: number | null = null;
  let nextPath: string | null = null;

  const state = await prisma.wkCatalogSyncState.upsert({
    where: { id: GLOBAL_STATE_ID },
    create: { id: GLOBAL_STATE_ID },
    update: {},
  });

  if (mode === "full") {
    const resumePath = resume ? parseFullResumePath(state.lastRunStats) : null;
    nextPath = resumePath ?? DEFAULT_SUBJECTS_PATH;
    cursorDataUpdatedAt = state.lastCursorDataUpdatedAt;
    cursorSubjectId = state.lastCursorSubjectId;
  } else {
    const resumePath = resume ? parseIncrementalResumePath(state.lastRunStats) : null;
    if (resumePath) {
      nextPath = resumePath;
    } else {
      const initialCursor = options.updatedAfterOverride ?? state.lastCursorDataUpdatedAt;
      if (!initialCursor) {
        throw new Error(
          "No incremental cursor found. Run full bootstrap first or provide updatedAfterOverride.",
        );
      }

      nextPath = buildUpdatedAfterPath(initialCursor);
      cursorDataUpdatedAt = initialCursor;
      cursorSubjectId = state.lastCursorSubjectId;
    }
  }

  if (apply) {
    const claim = await prisma.wkCatalogSyncState.updateMany({
      where: {
        id: GLOBAL_STATE_ID,
        OR: [{ isSyncing: false }, { syncLockUntil: { lt: new Date() } }, { syncLockUntil: null }],
      },
      data: {
        isSyncing: true,
        syncLockUntil: nowPlus(lockMs),
        lastStatus: "running",
        lastError: null,
        ...(mode === "full"
          ? { lastFullSyncStartedAt: new Date() }
          : { lastIncrementalSyncStartedAt: new Date() }),
      },
    });

    if (claim.count === 0) {
      throw new Error("Catalog sync is currently locked by another run.");
    }

    claimedLock = true;

    const run = await prisma.wkCatalogSyncRun.create({
      data: {
        runType: mode,
        status: "running",
        cursorFromDataUpdatedAt: cursorDataUpdatedAt,
        cursorFromSubjectId: cursorSubjectId,
        stats: {
          mode: apply ? "apply" : "dry-run",
          syncType: mode,
          fullResumePath: mode === "full" ? nextPath : null,
          incrementalResumePath: mode === "incremental" ? nextPath : null,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    runId = run.id;
  }

  try {
    while (nextPath) {
      if (maxPages && pagesProcessed >= maxPages) {
        break;
      }

      const response = await fetchWaniKani<WaniKaniCollectionResponse>(nextPath, tokenResult.token);
      const collection = response.data;
      if (!collection) {
        break;
      }

      pagesProcessed += 1;
      fetchedCount += collection.data.length;

      const normalizedRows: SubjectUpsertRow[] = [];
      for (const row of collection.data) {
        const parsed = parseSubjectRow(row, collection.data_updated_at ?? null);
        if (!parsed) {
          parseErrorCount += 1;
          continue;
        }

        normalizedRows.push(parsed);
      }

      if (normalizedRows.length > 0) {
        const existingRows = await prisma.wkSubjectCatalog.findMany({
          where: {
            wkSubjectId: {
              in: normalizedRows.map((row) => row.wkSubjectId),
            },
          },
          select: {
            wkSubjectId: true,
            dataUpdatedAt: true,
          },
        });

        const existingById = new Map(existingRows.map((row) => [row.wkSubjectId, row.dataUpdatedAt]));

        for (const row of normalizedRows) {
          const nextCursor = updateCursor(
            { dataUpdatedAt: cursorDataUpdatedAt, subjectId: cursorSubjectId },
            { dataUpdatedAt: row.dataUpdatedAt, subjectId: row.wkSubjectId },
          );
          cursorDataUpdatedAt = nextCursor.dataUpdatedAt;
          cursorSubjectId = nextCursor.subjectId;

          const existingUpdatedAt = existingById.get(row.wkSubjectId);
          const unchanged =
            existingUpdatedAt !== undefined &&
            existingUpdatedAt.getTime() === row.dataUpdatedAt.getTime();

          if (unchanged) {
            skippedCount += 1;
            continue;
          }

          changedCount += 1;

          if (apply) {
            await prisma.wkSubjectCatalog.upsert({
              where: { wkSubjectId: row.wkSubjectId },
              create: {
                wkSubjectId: row.wkSubjectId,
                object: row.object,
                subjectType: row.subjectType,
                level: row.level,
                slug: row.slug,
                characters: row.characters,
                documentUrl: row.documentUrl,
                dataUpdatedAt: row.dataUpdatedAt,
                hiddenAt: row.hiddenAt,
                meanings: row.meanings,
                readings: row.readings,
                componentSubjectIds: row.componentSubjectIds,
                amalgamationSubjectIds: row.amalgamationSubjectIds,
                visuallySimilarSubjectIds: row.visuallySimilarSubjectIds,
                meaningMnemonic: row.meaningMnemonic,
                meaningHint: row.meaningHint,
                readingMnemonic: row.readingMnemonic,
                readingHint: row.readingHint,
                rawData: row.rawData,
              },
              update: {
                object: row.object,
                subjectType: row.subjectType,
                level: row.level,
                slug: row.slug,
                characters: row.characters,
                documentUrl: row.documentUrl,
                dataUpdatedAt: row.dataUpdatedAt,
                hiddenAt: row.hiddenAt,
                meanings: row.meanings,
                readings: row.readings,
                componentSubjectIds: row.componentSubjectIds,
                amalgamationSubjectIds: row.amalgamationSubjectIds,
                visuallySimilarSubjectIds: row.visuallySimilarSubjectIds,
                meaningMnemonic: row.meaningMnemonic,
                meaningHint: row.meaningHint,
                readingMnemonic: row.readingMnemonic,
                readingHint: row.readingHint,
                rawData: row.rawData,
                documentVersion: { increment: 1 },
              },
            });

            upsertedCount += 1;
          }
        }
      }

      nextPath = extractNextPath(collection.pages.next_url);

      if (apply && runId) {
        const progressStats: ProgressStats = {
          mode: apply ? "apply" : "dry-run",
          syncType: mode,
          pagesProcessed,
          fetchedCount,
          upsertedCount,
          changedCount,
          skippedCount,
          parseErrorCount,
          fullResumePath: mode === "full" ? nextPath : null,
          incrementalResumePath: mode === "incremental" ? nextPath : null,
          cursorDataUpdatedAt: cursorDataUpdatedAt ? cursorDataUpdatedAt.toISOString() : null,
          cursorSubjectId,
          updatedAt: new Date().toISOString(),
        };

        await prisma.wkCatalogSyncState.update({
          where: { id: GLOBAL_STATE_ID },
          data: {
            syncLockUntil: nowPlus(lockMs),
            lastStatus: "running",
            lastCursorDataUpdatedAt: cursorDataUpdatedAt,
            lastCursorSubjectId: cursorSubjectId,
            lastRunStats: progressStats as Prisma.InputJsonValue,
          },
        });

        await prisma.wkCatalogSyncRun.update({
          where: { id: runId },
          data: {
            fetchedCount,
            upsertedCount,
            changedCount,
            errorCount: parseErrorCount,
            stats: progressStats as Prisma.InputJsonValue,
          },
        });
      }
    }

    const completedAt = new Date();
    const durationMs = Date.now() - startedAtMs;

    if (apply && runId) {
      const finalStats: ProgressStats = {
        mode: apply ? "apply" : "dry-run",
        syncType: mode,
        pagesProcessed,
        fetchedCount,
        upsertedCount,
        changedCount,
        skippedCount,
        parseErrorCount,
        fullResumePath: mode === "full" ? nextPath : null,
        incrementalResumePath: mode === "incremental" ? nextPath : null,
        cursorDataUpdatedAt: cursorDataUpdatedAt ? cursorDataUpdatedAt.toISOString() : null,
        cursorSubjectId,
        updatedAt: new Date().toISOString(),
      };

      await prisma.$transaction([
        prisma.wkCatalogSyncRun.update({
          where: { id: runId },
          data: {
            status: "ok",
            completedAt,
            durationMs,
            cursorToDataUpdatedAt: cursorDataUpdatedAt,
            cursorToSubjectId: cursorSubjectId,
            fetchedCount,
            upsertedCount,
            changedCount,
            errorCount: parseErrorCount,
            stats: finalStats as Prisma.InputJsonValue,
          },
        }),
        prisma.wkCatalogSyncState.update({
          where: { id: GLOBAL_STATE_ID },
          data: {
            isSyncing: false,
            syncLockUntil: null,
            lastStatus: "ok",
            lastError: null,
            ...(mode === "full"
              ? { lastFullSyncCompletedAt: completedAt }
              : { lastIncrementalSyncCompletedAt: completedAt }),
            lastCursorDataUpdatedAt: cursorDataUpdatedAt,
            lastCursorSubjectId: cursorSubjectId,
            lastRunStats: finalStats as Prisma.InputJsonValue,
          },
        }),
      ]);
    }

    return {
      mode,
      applied: apply,
      tokenSource: tokenResult.source,
      pagesProcessed,
      fetchedCount,
      upsertedCount,
      changedCount,
      skippedCount,
      parseErrorCount,
      durationMs,
      cursorDataUpdatedAt: cursorDataUpdatedAt ? cursorDataUpdatedAt.toISOString() : null,
      cursorSubjectId,
      resumePath: nextPath,
      runId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 400) : "unknown-catalog-sync-error";

    if (apply && runId) {
      await prisma.$transaction([
        prisma.wkCatalogSyncRun.update({
          where: { id: runId },
          data: {
            status: "error",
            completedAt: new Date(),
            durationMs: Date.now() - startedAtMs,
            errorCount: parseErrorCount + 1,
            errorMessage: message,
          },
        }),
        prisma.wkCatalogSyncState.update({
          where: { id: GLOBAL_STATE_ID },
          data: {
            isSyncing: false,
            syncLockUntil: null,
            lastStatus: "error",
            lastError: message,
          },
        }),
      ]);
    } else if (apply && claimedLock) {
      await prisma.wkCatalogSyncState.update({
        where: { id: GLOBAL_STATE_ID },
        data: {
          isSyncing: false,
          syncLockUntil: null,
          lastStatus: "error",
          lastError: message,
        },
      });
    }

    throw error;
  }
}
