import { Prisma } from "@prisma/client";

import { normalizeAssignmentType, toDate } from "./helpers";
import type { WaniKaniCollectionResponse } from "./types";
import type { SubjectUpsertRow } from "./catalogSync.types";
import { DEFAULT_SUBJECTS_PATH } from "./catalogSync.constants";

export function nowPlus(ms: number): Date {
  return new Date(Date.now() + ms);
}

export function extractNextPath(nextUrl: string | null): string | null {
  if (!nextUrl) {
    return null;
  }

  const url = new URL(nextUrl);
  return `${url.pathname}${url.search}`.replace("/v2", "");
}

export function parseFullResumePath(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const row = input as Record<string, unknown>;
  return typeof row.fullResumePath === "string" ? row.fullResumePath : null;
}

export function parseIncrementalResumePath(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const row = input as Record<string, unknown>;
  return typeof row.incrementalResumePath === "string" ? row.incrementalResumePath : null;
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

export function parseSubjectRow(
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

  const dataUpdatedAt = toDate(row.data_updated_at ?? fallbackDataUpdatedAt) ?? new Date();

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

export function updateCursor(
  current: { dataUpdatedAt: Date | null; subjectId: number | null },
  candidate: { dataUpdatedAt: Date; subjectId: number },
): { dataUpdatedAt: Date; subjectId: number } {
  const currentDate = current.dataUpdatedAt;
  const currentId = current.subjectId;

  if (!currentDate) {
    return { dataUpdatedAt: candidate.dataUpdatedAt, subjectId: candidate.subjectId };
  }

  if (candidate.dataUpdatedAt.getTime() > currentDate.getTime()) {
    return { dataUpdatedAt: candidate.dataUpdatedAt, subjectId: candidate.subjectId };
  }

  if (
    candidate.dataUpdatedAt.getTime() === currentDate.getTime() &&
    (currentId === null || candidate.subjectId > currentId)
  ) {
    return { dataUpdatedAt: candidate.dataUpdatedAt, subjectId: candidate.subjectId };
  }

  return {
    dataUpdatedAt: currentDate,
    subjectId: currentId ?? candidate.subjectId,
  };
}

export function buildUpdatedAfterPath(updatedAfter: Date): string {
  return `${DEFAULT_SUBJECTS_PATH}&updated_after=${encodeURIComponent(updatedAfter.toISOString())}`;
}
