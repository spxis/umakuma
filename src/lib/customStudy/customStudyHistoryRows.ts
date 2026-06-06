import { SRS_BUCKETS, type SrsBucket } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import type { StudyHistoryRow } from "@/lib/studyHistoryView";

import { toCustomSrsGrouping } from "./customSrs";
import { customItemTypeToSubjectType } from "./customStudyQueue";

type Args = {
  accountId: string;
  libraryId?: string;
  result?: "correct" | "wrong" | "skipped";
};

async function resolveScopedLibraryId(params: { accountId: string; libraryId?: string }): Promise<string | null> {
  const requestedLibraryId = params.libraryId?.trim();
  if (requestedLibraryId) {
    const owned = await prisma.customStudyLibrary.findFirst({
      where: { id: requestedLibraryId, accountId: params.accountId },
      select: { id: true },
    });
    return owned?.id ?? null;
  }

  const active = await prisma.customStudyLibrary.findFirst({
    where: { accountId: params.accountId, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (active?.id) {
    return active.id;
  }

  const fallback = await prisma.customStudyLibrary.findFirst({
    where: { accountId: params.accountId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

function customBucketForStage(stage: number | null): SrsBucket {
  if (typeof stage !== "number") {
    return SRS_BUCKETS.unknown;
  }

  return toCustomSrsGrouping(stage);
}

function customStatusForStage(stage: number | null) {
  if (typeof stage !== "number") {
    return undefined;
  }

  return toCustomSrsGrouping(stage);
}

export async function getCustomStudyHistoryRows(args: Args): Promise<StudyHistoryRow[]> {
  const scopedLibraryId = await resolveScopedLibraryId({
    accountId: args.accountId,
    libraryId: args.libraryId,
  });
  if (!scopedLibraryId) {
    return [];
  }

  const [account, attempts] = await Promise.all([
    prisma.account.findFirst({
      where: { id: args.accountId },
      select: { nickname: true, wkUsername: true },
    }),
    prisma.customStudyReviewAttempt.findMany({
      where: {
        accountId: args.accountId,
        libraryId: scopedLibraryId,
        ...(args.result ? { result: args.result } : {}),
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        accountId: true,
        stateId: true,
        itemId: true,
        result: true,
        newSrsStage: true,
        submittedAt: true,
        item: {
          select: {
            itemType: true,
            wkLevel: true,
            characters: true,
            meanings: true,
            readings: true,
            primaryReading: true,
            meaningMnemonic: true,
            readingMnemonic: true,
          },
        },
        state: {
          select: {
            srsStage: true,
            startedAt: true,
            passedAt: true,
            availableAt: true,
          },
        },
      },
    }),
  ]);

  const fallbackUser = args.accountId;
  const nickname = account?.nickname ?? fallbackUser;
  const wkUsername = account?.wkUsername ?? fallbackUser;

  return attempts.map((row) => {
    const subjectType = customItemTypeToSubjectType(row.item.itemType);
    const reading = row.item.primaryReading ?? row.item.readings[0] ?? null;
    const meaning = row.item.meanings[0] ?? null;
    const stage = typeof row.newSrsStage === "number" ? row.newSrsStage : row.state?.srsStage ?? null;
    const level = typeof row.item.wkLevel === "number" ? row.item.wkLevel : null;

    return {
      id: row.id,
      accountId: row.accountId,
      nickname,
      wkUsername,
      assignmentId: row.stateId,
      subjectId: row.itemId,
      subjectType,
      result: row.result,
      submittedAt: row.submittedAt.toISOString(),
      subjectLabel: row.item.characters,
      subjectReading: reading,
      subjectMeaning: meaning,
      wkLevel: level,
      srsStage: stage,
      srsBucket: customBucketForStage(stage),
      subjectData: {
        subjectId: row.itemId,
        subjectType,
        status: customStatusForStage(stage),
        characters: row.item.characters,
        meanings: row.item.meanings,
        readings: row.item.readings,
        primaryReadings: reading ? [reading] : row.item.readings,
        meaningExplanation: row.item.meaningMnemonic ?? undefined,
        readingExplanation: row.item.readingMnemonic ?? undefined,
        startedAt: row.state?.startedAt?.toISOString() ?? null,
        passedAt: row.state?.passedAt?.toISOString() ?? null,
        availableAt: row.state?.availableAt?.toISOString() ?? null,
        wkLevel: level ?? undefined,
        srsStage: stage ?? undefined,
      },
    };
  });
}