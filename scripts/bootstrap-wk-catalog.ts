import { Prisma } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { normalizeAssignmentType, toDate } from "../src/lib/wanikani/helpers";
import { fetchWaniKani } from "../src/lib/wanikani/http";
import type { WaniKaniCollectionResponse } from "../src/lib/wanikani/types";

const DEFAULT_SUBJECTS_PATH = "/subjects?types=radical,kanji,vocabulary&hidden=true";
const SYNC_LOCK_MS = 45 * 60 * 1000;
const GLOBAL_STATE_ID = "global";

type Args = {
  apply: boolean;
  resume: boolean;
  maxPages: number | null;
  tokenFromArg: string | null;
};

type SubjectUpsertRow = {
  wkSubjectId: number;
  object: string;
  subjectType: string;
  level: number;
  slug: string | null;
  characters: string | null;
  documentUrl: string | null;
  dataUpdatedAt: Date;
  hiddenAt: Date | null;
  meanings: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
  readings: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
  meaningMnemonic: string | null;
  meaningHint: string | null;
  readingMnemonic: string | null;
  readingHint: string | null;
  rawData: Prisma.InputJsonValue;
};

type SyncProgressStats = {
  mode: "apply" | "dry-run";
  pagesProcessed: number;
  fetchedCount: number;
  upsertedCount: number;
  changedCount: number;
  skippedCount: number;
  parseErrorCount: number;
  fullResumePath: string | null;
  updatedAt: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);

  const apply = args.includes("--apply");
  const resume = !args.includes("--no-resume");

  const tokenArg = args.find((arg) => arg.startsWith("--token="));
  const tokenFromArg = tokenArg ? tokenArg.replace("--token=", "").trim() : null;

  const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
  const rawMaxPages = maxPagesArg ? Number(maxPagesArg.replace("--max-pages=", "")) : NaN;
  const maxPages = Number.isFinite(rawMaxPages) && rawMaxPages > 0 ? Math.floor(rawMaxPages) : null;

  return {
    apply,
    resume,
    maxPages,
    tokenFromArg,
  };
}

function nowPlus(ms: number): Date {
  return new Date(Date.now() + ms);
}

function extractNextPath(nextUrl: string | null): string | null {
  if (!nextUrl) {
    return null;
  }

  const url = new URL(nextUrl);
  return `${url.pathname}${url.search}`.replace("/v2", "");
}

function parseResumePath(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const row = input as Record<string, unknown>;
  return typeof row.fullResumePath === "string" ? row.fullResumePath : null;
}

function toIntArray(input: unknown): number[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function toOptionalString(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableJsonArray(input: unknown): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  if (!Array.isArray(input)) {
    return Prisma.JsonNull;
  }

  return input as Prisma.InputJsonValue;
}

function parseSubjectRow(
  row: WaniKaniCollectionResponse["data"][number],
  fallbackDataUpdatedAt: string | null,
): SubjectUpsertRow | null {
  const subjectType = normalizeAssignmentType(row.object ?? "");
  if (!subjectType) {
    return null;
  }

  const data = row.data as Record<string, unknown>;
  const level = typeof data.level === "number" && Number.isFinite(data.level) ? Math.floor(data.level) : null;
  if (!level || level < 1) {
    return null;
  }

  const dataUpdatedAt =
    toDate(row.data_updated_at ?? fallbackDataUpdatedAt) ??
    new Date();

  return {
    wkSubjectId: row.id,
    object: typeof row.object === "string" ? row.object : "subject",
    subjectType,
    level,
    slug: toOptionalString(data.slug),
    characters: toOptionalString(data.characters),
    documentUrl: toOptionalString(data.document_url),
    dataUpdatedAt,
    hiddenAt: toDate(data.hidden_at),
    meanings: toNullableJsonArray(data.meanings),
    readings: toNullableJsonArray(data.readings),
    componentSubjectIds: toIntArray(data.component_subject_ids),
    amalgamationSubjectIds: toIntArray(data.amalgamation_subject_ids),
    visuallySimilarSubjectIds: toIntArray(data.visually_similar_subject_ids),
    meaningMnemonic: toOptionalString(data.meaning_mnemonic),
    meaningHint: toOptionalString(data.meaning_hint),
    readingMnemonic: toOptionalString(data.reading_mnemonic),
    readingHint: toOptionalString(data.reading_hint),
    rawData: data as Prisma.InputJsonValue,
  };
}

function resolveToken(args: Args): string | null {
  if (args.tokenFromArg) {
    return args.tokenFromArg;
  }

  return process.env.WK_CATALOG_API_TOKEN ?? process.env.WANIKANI_API_TOKEN ?? null;
}

async function bootstrapWkCatalog() {
  const args = parseArgs();
  const token = resolveToken(args);

  if (!token) {
    throw new Error(
      "Missing WaniKani token. Set WK_CATALOG_API_TOKEN or WANIKANI_API_TOKEN, or pass --token=<value>.",
    );
  }

  const mode = args.apply ? "apply" : "dry-run";
  const maxPages = args.maxPages ?? (args.apply ? null : 1);

  console.log(`Mode: ${mode}`);
  console.log(`Resume enabled: ${args.resume ? "yes" : "no"}`);
  console.log(`Max pages: ${maxPages ?? "all"}`);

  let claimedLock = false;
  let runId: string | null = null;
  let pagesProcessed = 0;
  let fetchedCount = 0;
  let upsertedCount = 0;
  let changedCount = 0;
  let skippedCount = 0;
  let parseErrorCount = 0;
  let cursorDataUpdatedAt: Date | null = null;
  let cursorSubjectId: number | null = null;

  const startedAtMs = Date.now();

  let nextPath: string | null = DEFAULT_SUBJECTS_PATH;
  if (args.apply) {
    const state = await prisma.wkCatalogSyncState.upsert({
      where: { id: GLOBAL_STATE_ID },
      create: { id: GLOBAL_STATE_ID },
      update: {},
    });

    const claim = await prisma.wkCatalogSyncState.updateMany({
      where: {
        id: GLOBAL_STATE_ID,
        OR: [
          { isSyncing: false },
          { syncLockUntil: { lt: new Date() } },
          { syncLockUntil: null },
        ],
      },
      data: {
        isSyncing: true,
        syncLockUntil: nowPlus(SYNC_LOCK_MS),
        lastStatus: "running",
        lastError: null,
        lastFullSyncStartedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      throw new Error("Catalog sync is currently locked by another run.");
    }

    claimedLock = true;

    const resumePath = args.resume ? parseResumePath(state.lastRunStats) : null;
    if (resumePath) {
      nextPath = resumePath;
      console.log(`Resuming from saved cursor path: ${resumePath}`);
    }

    cursorDataUpdatedAt = state.lastCursorDataUpdatedAt;
    cursorSubjectId = state.lastCursorSubjectId;

    const run = await prisma.wkCatalogSyncRun.create({
      data: {
        runType: "full",
        status: "running",
        cursorFromDataUpdatedAt: cursorDataUpdatedAt,
        cursorFromSubjectId: cursorSubjectId,
        stats: {
          mode,
          resumePath,
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

      const response = await fetchWaniKani<WaniKaniCollectionResponse>(nextPath, token);
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
        const existingRows = args.apply
          ? await prisma.wkSubjectCatalog.findMany({
              where: {
                wkSubjectId: {
                  in: normalizedRows.map((row) => row.wkSubjectId),
                },
              },
              select: {
                wkSubjectId: true,
                dataUpdatedAt: true,
              },
            })
          : [];

        const existingById = new Map(existingRows.map((row) => [row.wkSubjectId, row.dataUpdatedAt]));

        for (const row of normalizedRows) {
          const existingUpdatedAt = existingById.get(row.wkSubjectId);
          const unchanged =
            existingUpdatedAt !== undefined &&
            existingUpdatedAt.getTime() === row.dataUpdatedAt.getTime();

          if (unchanged) {
            skippedCount += 1;
            continue;
          }

          changedCount += 1;

          if (args.apply) {
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

        const lastRow = normalizedRows[normalizedRows.length - 1];
        if (lastRow) {
          cursorDataUpdatedAt = lastRow.dataUpdatedAt;
          cursorSubjectId = lastRow.wkSubjectId;
        }
      }

      nextPath = extractNextPath(collection.pages.next_url);

      console.log(
        `Page ${pagesProcessed}: fetched=${fetchedCount} changed=${changedCount} upserted=${upsertedCount} skipped=${skippedCount} parseErrors=${parseErrorCount}`,
      );

      if (args.apply && runId) {
        const progressStats: SyncProgressStats = {
          mode,
          pagesProcessed,
          fetchedCount,
          upsertedCount,
          changedCount,
          skippedCount,
          parseErrorCount,
          fullResumePath: nextPath,
          updatedAt: new Date().toISOString(),
        };

        await prisma.wkCatalogSyncState.update({
          where: { id: GLOBAL_STATE_ID },
          data: {
            syncLockUntil: nowPlus(SYNC_LOCK_MS),
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

    console.log(
      `Complete: mode=${mode} pages=${pagesProcessed} fetched=${fetchedCount} changed=${changedCount} upserted=${upsertedCount} skipped=${skippedCount} parseErrors=${parseErrorCount}`,
    );

    if (args.apply && runId) {
      const finalStats: SyncProgressStats = {
        mode,
        pagesProcessed,
        fetchedCount,
        upsertedCount,
        changedCount,
        skippedCount,
        parseErrorCount,
        fullResumePath: nextPath,
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
            lastFullSyncCompletedAt: completedAt,
            lastCursorDataUpdatedAt: cursorDataUpdatedAt,
            lastCursorSubjectId: cursorSubjectId,
            lastRunStats: finalStats as Prisma.InputJsonValue,
          },
        }),
      ]);
    }
  } catch (error) {
    if (args.apply && runId) {
      const message = error instanceof Error ? error.message.slice(0, 400) : "unknown-bootstrap-error";

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
    } else if (args.apply && claimedLock) {
      const message = error instanceof Error ? error.message.slice(0, 400) : "unknown-bootstrap-error";
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

bootstrapWkCatalog()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
