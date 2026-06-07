import { Prisma, type CustomStudyItemType } from "@prisma/client";

import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

import { enrichCustomLibraryItemsWithWaniKani } from "./customLibraryWanikaniEnrichment";
import type { CustomLibraryItemPayload } from "./customStudyTypes";

const CUSTOM_LIBRARY_BACKFILL_TX_MAX_WAIT_MS = 10_000;
const CUSTOM_LIBRARY_BACKFILL_TX_TIMEOUT_MS = 120_000;

const backfilledLibraryKeys = new Set<string>();
const backfillInFlightByLibraryKey = new Map<string, Promise<void>>();

type CustomLibraryItemRow = {
  id: number;
  externalId: string;
  itemType: CustomStudyItemType;
  wkLevel: number;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReading: string | null;
  meaningMnemonic: string | null;
  readingMnemonic: string | null;
  synonyms: string[];
  notes: string | null;
  metadata: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapItemToPayload(item: CustomLibraryItemRow): CustomLibraryItemPayload {
  const normalizedItemType = item.itemType === "phrase" ? "vocabulary" : item.itemType;

  return {
    id: item.externalId,
    type: normalizedItemType,
    level: item.wkLevel,
    characters: item.characters,
    meanings: item.meanings,
    readings: item.readings,
    primaryReading: item.primaryReading ?? undefined,
    meaningMnemonic: item.meaningMnemonic ?? undefined,
    readingMnemonic: item.readingMnemonic ?? undefined,
    synonyms: item.synonyms,
    notes: item.notes ?? undefined,
    metadata: isRecord(item.metadata) ? item.metadata : undefined,
  };
}

async function runCustomLibraryBackfill(params: { accountId: string; libraryId: string }): Promise<void> {
  const [account, existingItems] = await Promise.all([
    prisma.account.findUnique({
      where: { id: params.accountId },
      select: {
        tokenEncrypted: true,
        tokenIv: true,
        tokenTag: true,
      },
    }),
    prisma.customStudyItem.findMany({
      where: { libraryId: params.libraryId },
      select: {
        id: true,
        externalId: true,
        itemType: true,
        wkLevel: true,
        characters: true,
        meanings: true,
        readings: true,
        primaryReading: true,
        meaningMnemonic: true,
        readingMnemonic: true,
        synonyms: true,
        notes: true,
        metadata: true,
      },
    }),
  ]);

  if (!account || existingItems.length === 0) {
    return;
  }

  const token = decryptToken({
    encrypted: account.tokenEncrypted,
    iv: account.tokenIv,
    tag: account.tokenTag,
  });

  const enrichedItems = await enrichCustomLibraryItemsWithWaniKani({
    token,
    items: existingItems.map((item) => mapItemToPayload(item)),
  });

  const existingByExternalId = new Map(existingItems.map((item) => [item.externalId, item]));

  await prisma.$transaction(
    async (tx) => {
      const createdItemIds: number[] = [];

      for (const item of enrichedItems) {
        const existing = existingByExternalId.get(item.id);
        const metadata = item.metadata as Prisma.InputJsonValue | undefined;

        if (existing) {
          await tx.customStudyItem.update({
            where: { id: existing.id },
            data: {
              itemType: item.type,
              wkLevel: item.level,
              characters: item.characters,
              meanings: item.meanings,
              readings: item.readings,
              primaryReading: item.primaryReading,
              meaningMnemonic: item.meaningMnemonic,
              readingMnemonic: item.readingMnemonic,
              synonyms: item.synonyms,
              notes: item.notes,
              ...(metadata === undefined ? {} : { metadata }),
            },
          });

          continue;
        }

        const created = await tx.customStudyItem.create({
          data: {
            libraryId: params.libraryId,
            externalId: item.id,
            itemType: item.type,
            wkLevel: item.level,
            characters: item.characters,
            meanings: item.meanings,
            readings: item.readings,
            primaryReading: item.primaryReading,
            meaningMnemonic: item.meaningMnemonic,
            readingMnemonic: item.readingMnemonic,
            synonyms: item.synonyms,
            notes: item.notes,
            metadata: metadata ?? Prisma.JsonNull,
          },
          select: { id: true },
        });

        createdItemIds.push(created.id);
      }

      if (createdItemIds.length > 0) {
        await tx.customStudyState.createMany({
          data: createdItemIds.map((itemId) => ({
            accountId: params.accountId,
            libraryId: params.libraryId,
            itemId,
          })),
          skipDuplicates: true,
        });
      }

      const itemCount = await tx.customStudyItem.count({
        where: { libraryId: params.libraryId },
      });

      await tx.customStudyLibrary.update({
        where: { id: params.libraryId },
        data: { itemCount },
      });
    },
    {
      maxWait: CUSTOM_LIBRARY_BACKFILL_TX_MAX_WAIT_MS,
      timeout: CUSTOM_LIBRARY_BACKFILL_TX_TIMEOUT_MS,
    },
  );
}

export async function backfillCustomLibraryWaniKaniEnrichment(params: {
  accountId: string;
  libraryId: string;
}): Promise<void> {
  await runCustomLibraryBackfill(params);
}

export async function ensureCustomLibraryWaniKaniBackfill(params: {
  accountId: string;
  libraryId: string;
}): Promise<void> {
  const key = `${params.accountId}:${params.libraryId}`;

  if (backfilledLibraryKeys.has(key)) {
    return;
  }

  const inFlight = backfillInFlightByLibraryKey.get(key);
  if (inFlight) {
    return inFlight;
  }

  const job = runCustomLibraryBackfill(params)
    .catch((error) => {
      console.error("Custom library WaniKani backfill failed.", error);
    })
    .finally(() => {
      backfillInFlightByLibraryKey.delete(key);
      backfilledLibraryKeys.add(key);
    });

  backfillInFlightByLibraryKey.set(key, job);
  return job;
}
