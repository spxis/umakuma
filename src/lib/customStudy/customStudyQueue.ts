import type { CustomStudyItemType } from "@prisma/client";

import { QUEUE_TYPES, type QueueType, type SubjectType } from "@/lib/domainConstants";

import { readCustomItemRelationships, resolveCustomItemSubjectType } from "./customItemMetadata";
import { toCustomSrsGrouping } from "./customSrs";

export type CustomStateQueueRow = {
  id: number;
  srsStage: number;
  availableAt: Date | null;
  startedAt: Date | null;
  passedAt: Date | null;
  item: {
    id: number;
    wkLevel?: number | null;
    itemType: CustomStudyItemType;
    metadata?: unknown;
    characters: string;
    meanings: string[];
    readings: string[];
    primaryReading: string | null;
    meaningMnemonic: string | null;
    readingMnemonic: string | null;
  };
};

export function customItemTypeToSubjectType(itemType: CustomStudyItemType, metadata?: unknown): SubjectType {
  return resolveCustomItemSubjectType(itemType, metadata);
}

export function isCustomLessonState(stage: number): boolean {
  return stage <= 0;
}

export function isCustomReviewReady(params: {
  srsStage: number;
  availableAt: Date | null;
  now: Date;
}): boolean {
  if (params.srsStage <= 0 || params.srsStage >= 9) {
    return false;
  }

  if (!params.availableAt) {
    return true;
  }

  return params.availableAt.getTime() <= params.now.getTime();
}

export function customQueueTypeFromState(params: {
  stage: number;
  now: Date;
  availableAt: Date | null;
}): QueueType {
  if (isCustomLessonState(params.stage)) {
    return QUEUE_TYPES.lesson;
  }

  if (isCustomReviewReady({ srsStage: params.stage, availableAt: params.availableAt, now: params.now })) {
    return QUEUE_TYPES.review;
  }

  return QUEUE_TYPES.review;
}

export function mapCustomQueueItem(row: CustomStateQueueRow, now: Date) {
  const level = typeof row.item.wkLevel === "number" && Number.isFinite(row.item.wkLevel) && row.item.wkLevel > 0
    ? Math.trunc(row.item.wkLevel)
    : 1;
  const subjectType = resolveCustomItemSubjectType(row.item.itemType, row.item.metadata);
  const relationships = readCustomItemRelationships(row.item.metadata);

  return {
    subjectId: row.item.id,
    assignmentId: row.id,
    queueType: customQueueTypeFromState({ stage: row.srsStage, now, availableAt: row.availableAt }),
    subjectType,
    wkLevel: level,
    ukLevel: level,
    characters: row.item.characters,
    meanings: row.item.meanings,
    readings: row.item.readings,
    primaryReadings: row.item.primaryReading ? [row.item.primaryReading] : row.item.readings,
    radicals: relationships.radicals,
    visuallySimilar: relationships.visuallySimilar,
    usedInVocabulary: relationships.usedInVocabulary,
    componentKanji: relationships.componentKanji,
    meaningExplanation: row.item.meaningMnemonic ?? "",
    readingExplanation: row.item.readingMnemonic ?? "",
    srsStage: row.srsStage,
    status: toCustomSrsGrouping(row.srsStage),
    startedAt: row.startedAt?.toISOString() ?? null,
    passedAt: row.passedAt?.toISOString() ?? null,
    availableAt: row.availableAt?.toISOString() ?? null,
  };
}
