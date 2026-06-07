import type { CustomStudyItemType } from "@prisma/client";

import { SUBJECT_TYPES, isSubjectType, type SubjectType } from "@/lib/domainConstants";

export type CustomItemRelationReference = {
  subjectId: number;
  label: string;
  wkLevel: number | null;
  reading: string | null;
  subjectType?: SubjectType;
};

export type CustomItemRelationships = {
  radicals: CustomItemRelationReference[];
  visuallySimilar: CustomItemRelationReference[];
  usedInVocabulary: CustomItemRelationReference[];
  componentKanji: CustomItemRelationReference[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toOptionalSubjectType(value: unknown): SubjectType | null {
  if (typeof value !== "string") {
    return null;
  }

  return isSubjectType(value) ? value : null;
}

function toRelationReference(value: unknown): CustomItemRelationReference | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.subjectId !== "number" || !Number.isInteger(value.subjectId) || value.subjectId <= 0) {
    return null;
  }

  if (typeof value.label !== "string" || value.label.trim().length === 0) {
    return null;
  }

  const wkLevel = typeof value.wkLevel === "number" && Number.isFinite(value.wkLevel)
    ? Math.trunc(value.wkLevel)
    : null;
  const reading = typeof value.reading === "string" && value.reading.trim().length > 0
    ? value.reading.trim()
    : null;
  const subjectType = toOptionalSubjectType(value.subjectType);

  return {
    subjectId: value.subjectId,
    label: value.label.trim(),
    wkLevel,
    reading,
    ...(subjectType ? { subjectType } : {}),
  };
}

function toRelationReferenceList(value: unknown): CustomItemRelationReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const output: CustomItemRelationReference[] = [];

  for (const row of value) {
    const parsed = toRelationReference(row);
    if (!parsed) {
      continue;
    }

    const key = `${parsed.subjectId}:${parsed.label}:${parsed.subjectType ?? "unknown"}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(parsed);
  }

  return output;
}

export function resolveCustomItemSubjectType(itemType: CustomStudyItemType, metadata: unknown): SubjectType {
  if (isRecord(metadata)) {
    const customSubjectType = toOptionalSubjectType(metadata.customSubjectType);
    if (customSubjectType) {
      return customSubjectType;
    }
  }

  if (itemType === "kanji") {
    return SUBJECT_TYPES.kanji;
  }

  return SUBJECT_TYPES.vocabulary;
}

export function readCustomItemRelationships(metadata: unknown): CustomItemRelationships {
  if (!isRecord(metadata) || !isRecord(metadata.relationships)) {
    return {
      radicals: [],
      visuallySimilar: [],
      usedInVocabulary: [],
      componentKanji: [],
    };
  }

  const relationships = metadata.relationships;

  return {
    radicals: toRelationReferenceList(relationships.radicals),
    visuallySimilar: toRelationReferenceList(relationships.visuallySimilar),
    usedInVocabulary: toRelationReferenceList(relationships.usedInVocabulary),
    componentKanji: toRelationReferenceList(relationships.componentKanji),
  };
}
