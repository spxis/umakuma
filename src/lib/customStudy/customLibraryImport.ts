import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";

import { customLibraryPayloadSchema } from "./customLibrarySchema";
import type { CustomLibraryImportSummary, CustomLibraryImportPayload } from "./customStudyTypes";

const DEFAULT_ITEMS_PER_LEVEL = 10;
const MAX_CUSTOM_WK_LEVEL = 60;

function uniqueTrimmed(input: string[] | undefined): string[] {
  if (!input) {
    return [];
  }

  return Array.from(new Set(input.map((value) => value.trim()).filter(Boolean)));
}

function clampLevel(value: number): number {
  return Math.min(MAX_CUSTOM_WK_LEVEL, Math.max(1, Math.trunc(value)));
}

function resolveItemsPerLevel(value: number | undefined): number {
  if (!Number.isFinite(value) || typeof value !== "number" || value <= 0) {
    return DEFAULT_ITEMS_PER_LEVEL;
  }

  return Math.max(1, Math.trunc(value));
}

function resolveItemLevel(params: {
  explicitLevel: number | undefined;
  index: number;
  itemsPerLevel: number;
}): number {
  if (typeof params.explicitLevel === "number" && Number.isFinite(params.explicitLevel)) {
    return clampLevel(params.explicitLevel);
  }

  return clampLevel(Math.floor(params.index / params.itemsPerLevel) + 1);
}

function normalizePayload(payload: CustomLibraryImportPayload): CustomLibraryImportPayload {
  const itemsPerLevel = resolveItemsPerLevel(payload.library.itemsPerLevel);

  return {
    schemaVersion: payload.schemaVersion,
    library: {
      id: payload.library.id.trim(),
      name: payload.library.name.trim(),
      description: payload.library.description?.trim(),
      itemsPerLevel,
    },
    items: payload.items.map((item, index) => ({
      id: item.id.trim(),
      type: item.type,
      level: resolveItemLevel({
        explicitLevel: item.level,
        index,
        itemsPerLevel,
      }),
      characters: item.characters.trim(),
      meanings: uniqueTrimmed(item.meanings),
      readings: uniqueTrimmed(item.readings),
      primaryReading: item.primaryReading?.trim(),
      meaningMnemonic: item.meaningMnemonic?.trim(),
      readingMnemonic: item.readingMnemonic?.trim(),
      synonyms: uniqueTrimmed(item.synonyms),
      notes: item.notes?.trim(),
    })),
  };
}

export class CustomLibraryValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[]) {
    super(message);
    this.name = "CustomLibraryValidationError";
    this.issues = issues;
  }
}

export async function importCustomLibraryPayload(input: {
  accountId: string;
  payload: unknown;
}): Promise<CustomLibraryImportSummary> {
  const parsed = customLibraryPayloadSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new CustomLibraryValidationError(
      "Invalid custom library payload.",
      parsed.error.issues.map((issue) => issue.message),
    );
  }

  const payload = normalizePayload(parsed.data);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existingLibrary = await tx.customStudyLibrary.findUnique({
      where: {
        accountId_externalKey: {
          accountId: input.accountId,
          externalKey: payload.library.id,
        },
      },
      select: { id: true },
    });

    const library = existingLibrary
      ? await tx.customStudyLibrary.update({
          where: { id: existingLibrary.id },
          data: {
            name: payload.library.name,
            description: payload.library.description,
            schemaVersion: payload.schemaVersion,
            metadata: {
              itemsPerLevel: payload.library.itemsPerLevel,
            },
            lastImportedAt: now,
            isActive: true,
          },
        })
      : await tx.customStudyLibrary.create({
          data: {
            accountId: input.accountId,
            externalKey: payload.library.id,
            name: payload.library.name,
            description: payload.library.description,
            schemaVersion: payload.schemaVersion,
            sourceType: "json_upload",
            metadata: {
              itemsPerLevel: payload.library.itemsPerLevel,
            },
            isActive: true,
            lastImportedAt: now,
          },
        });

    await tx.customStudyLibrary.updateMany({
      where: {
        accountId: input.accountId,
        id: { not: library.id },
      },
      data: { isActive: false },
    });

    const existingItems = await tx.customStudyItem.findMany({
      where: { libraryId: library.id },
      select: { id: true, externalId: true },
    });
    const existingItemMap = new Map(existingItems.map((row) => [row.externalId, row]));

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of payload.items) {
      const existing = existingItemMap.get(item.id);
      if (existing) {
        await tx.customStudyItem.update({
          where: { id: existing.id },
          data: {
            itemType: item.type,
            characters: item.characters,
            meanings: item.meanings,
            readings: item.readings,
            primaryReading: item.primaryReading,
            meaningMnemonic: item.meaningMnemonic,
            readingMnemonic: item.readingMnemonic,
            synonyms: item.synonyms,
            notes: item.notes,
            wkLevel: item.level ?? 1,
          },
        });
        updatedCount += 1;
      } else {
        await tx.customStudyItem.create({
          data: {
            libraryId: library.id,
            externalId: item.id,
            itemType: item.type,
            characters: item.characters,
            meanings: item.meanings,
            readings: item.readings,
            primaryReading: item.primaryReading,
            meaningMnemonic: item.meaningMnemonic,
            readingMnemonic: item.readingMnemonic,
            synonyms: item.synonyms,
            notes: item.notes,
            wkLevel: item.level ?? 1,
          },
        });
        createdCount += 1;
      }
    }

    const incomingItemIds = payload.items.map((item) => item.id);
    const removedResult = await tx.customStudyItem.deleteMany({
      where: {
        libraryId: library.id,
        externalId: { notIn: incomingItemIds },
      },
    });

    const currentItems = await tx.customStudyItem.findMany({
      where: { libraryId: library.id },
      select: { id: true },
    });

    if (currentItems.length > 0) {
      await tx.customStudyState.createMany({
        data: currentItems.map((item) => ({
          accountId: input.accountId,
          libraryId: library.id,
          itemId: item.id,
        })),
        skipDuplicates: true,
      });
    }

    await tx.customStudyLibrary.update({
      where: { id: library.id },
      data: {
        itemCount: currentItems.length,
        lastImportedAt: now,
      },
    });

    return {
      libraryId: library.id,
      externalKey: payload.library.id,
      libraryName: payload.library.name,
      createdLibrary: existingLibrary === null,
      importedCount: payload.items.length,
      createdCount,
      updatedCount,
      removedCount: removedResult.count,
    };
  });
}

export function collectCustomLibraryValidationIssues(error: unknown): string[] {
  if (error instanceof CustomLibraryValidationError) {
    return error.issues;
  }

  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message);
  }

  return [];
}
