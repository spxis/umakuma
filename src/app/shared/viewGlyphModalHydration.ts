import type { StudyQueueItem } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";
import { isSubjectType, type SubjectType } from "@/lib/domainConstants";

type CatalogSubjectPayload = {
  subjectId?: number;
  subjectType?: SubjectType;
  wkLevel?: number;
  characters?: string;
  meanings?: string[];
  readings?: string[];
  primaryReadings?: string[];
  radicals?: StudyQueueItem["radicals"];
  visuallySimilar?: StudyQueueItem["visuallySimilar"];
  usedInVocabulary?: StudyQueueItem["usedInVocabulary"];
  componentKanji?: StudyQueueItem["componentKanji"];
  meaningExplanation?: string;
  readingExplanation?: string;
  jlptLevel?: number | null;
  jlptMeta?: StudyQueueItem["jlptMeta"];
};

function firstNonEmpty(values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "-";
}

function nonEmptyStringArray(values: string[] | null | undefined, fallback?: string): string[] {
  if (Array.isArray(values)) {
    const next = values.filter((value) => typeof value === "string" && value.trim().length > 0);
    if (next.length > 0) {
      return next;
    }
  }

  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return [fallback];
  }

  return [];
}

function toHydratedStudyQueueItem(
  subject: CatalogSubjectPayload,
  fallbackType: SubjectType,
  fallbackItem: StudyQueueItem,
): StudyQueueItem | null {
  if (typeof subject.subjectId !== "number") {
    return null;
  }

  const subjectType = isSubjectType(subject.subjectType) ? subject.subjectType : fallbackType;
  const readings = nonEmptyStringArray(subject.readings);
  const primaryReadings = nonEmptyStringArray(subject.primaryReadings, readings[0]);

  return {
    assignmentId: -1,
    queueType: "review",
    subjectId: subject.subjectId,
    subjectType,
    wkLevel: typeof subject.wkLevel === "number" ? subject.wkLevel : fallbackItem.wkLevel,
    characters: firstNonEmpty([subject.characters, String(subject.subjectId)]),
    meanings: nonEmptyStringArray(subject.meanings, fallbackItem.meanings[0] ?? "-"),
    readings,
    primaryReadings,
    radicals: subject.radicals ?? [],
    visuallySimilar: subject.visuallySimilar ?? [],
    usedInVocabulary: subject.usedInVocabulary ?? [],
    componentKanji: subject.componentKanji ?? [],
    meaningExplanation: subject.meaningExplanation,
    readingExplanation: subject.readingExplanation,
    jlptLevel: subject.jlptLevel ?? fallbackItem.jlptLevel ?? null,
    jlptMeta: subject.jlptMeta ?? null,
    srsStage: fallbackItem.srsStage,
    status: fallbackItem.status,
    startedAt: fallbackItem.startedAt ?? null,
    passedAt: fallbackItem.passedAt ?? null,
    availableAt: fallbackItem.availableAt ?? null,
  };
}

export function shouldHydrateViewGlyphItem(item: StudyQueueItem): boolean {
  const hasMeaningExplanation = typeof item.meaningExplanation === "string" && item.meaningExplanation.trim().length > 0;
  const hasReadingExplanation = typeof item.readingExplanation === "string" && item.readingExplanation.trim().length > 0;
  const hasRelated =
    (item.radicals?.length ?? 0) > 0 ||
    (item.visuallySimilar?.length ?? 0) > 0 ||
    (item.usedInVocabulary?.length ?? 0) > 0 ||
    (item.componentKanji?.length ?? 0) > 0;
  const hasJlpt = item.jlptMeta !== null && item.jlptMeta !== undefined;

  return !(hasMeaningExplanation || hasReadingExplanation || hasRelated || hasJlpt);
}

export async function fetchHydratedViewGlyphSubject(input: {
  accountId: string;
  subjectId: number;
  fallbackType: SubjectType;
  fallbackItem: StudyQueueItem;
}): Promise<StudyQueueItem | null> {
  if (!input.accountId || !Number.isInteger(input.subjectId) || input.subjectId <= 0) {
    return null;
  }

  try {
    const response = await fetch(`/api/accounts/${input.accountId}/subjects/${input.subjectId}`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      subject?: CatalogSubjectPayload;
    };
    if (!payload.subject) {
      return null;
    }

    return toHydratedStudyQueueItem(payload.subject, input.fallbackType, input.fallbackItem);
  } catch {
    return null;
  }
}
