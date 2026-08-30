import { prisma } from "@/lib/prisma";
import { fetchAllCollectionPages, fetchWaniKani } from "@/lib/wanikani/http";
import type { WaniKaniCollectionResponse } from "@/lib/wanikani/types";
import { QUEUE_TYPES, SUBJECT_TYPES, type QueueType, type SubjectType } from "@/lib/domainConstants";

export type AssignmentData = {
  subject_id: number;
  subject_type: string;
  srs_stage: number;
  unlocked_at: string | null;
  started_at: string | null;
  passed_at: string | null;
  available_at: string | null;
};

export type SubjectData = {
  level?: number;
  characters?: string | null;
  slug?: string | null;
  component_subject_ids?: number[];
  amalgamation_subject_ids?: number[];
  visually_similar_subject_ids?: number[];
  meanings?: Array<{ meaning: string; primary?: boolean }>;
  auxiliary_meanings?: Array<{ meaning: string; type?: string }>;
  readings?: Array<{ reading: string; primary?: boolean; accepted_answer?: boolean }>;
  meaning_mnemonic?: string;
  reading_mnemonic?: string;
};

export type QueueMode = QueueType;

export type AssignmentRow = {
  id: number;
  data: AssignmentData;
};

export type CachedSubjectRow = {
  object: string;
  data: SubjectData;
  fetchedAtMs: number;
};

export type QueueSyncState = {
  assignmentById: Map<number, AssignmentRow>;
  subjectById: Map<number, CachedSubjectRow>;
};

export const ASSIGNMENT_FULL_RESYNC_MS = 10 * 60_000;
export const SUBJECT_CACHE_TTL_MS = 24 * 60 * 60_000;
export const ASSIGNMENT_CHUNK_SIZE = 200;
export const SUBJECT_CACHE_MAX_ENTRIES = 2_500;

export function normalizeSubjectType(input: string): SubjectType {
  if (input === SUBJECT_TYPES.radical || input === SUBJECT_TYPES.kanji) {
    return input;
  }

  return SUBJECT_TYPES.vocabulary;
}

export function modePathParam(mode: QueueMode, includeReviewed: boolean = false): string {
  return mode === QUEUE_TYPES.review
    ? includeReviewed
      ? "srs_stages=1,2,3,4,5,6,7,8,9"
      : "immediately_available_for_review=true"
    : "srs_stages=0";
}

/**
 * The subjects the local catalog already holds, in the WaniKani row shape.
 *
 * These are the same subjects the API would return, synced into
 * `WkSubjectCatalog` precisely so they do not have to be fetched per request.
 * Both queue paths ask for them in bulk, so this is the shared lookup rather
 * than two copies of the mapping.
 */
export async function fetchCatalogSubjects(
  subjectIds: number[],
): Promise<Map<number, { object: string; data: SubjectData }>> {
  const found = new Map<number, { object: string; data: SubjectData }>();
  if (subjectIds.length === 0) {
    return found;
  }

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { wkSubjectId: { in: subjectIds } },
    select: {
      wkSubjectId: true,
      object: true,
      subjectType: true,
      level: true,
      slug: true,
      characters: true,
      meanings: true,
      readings: true,
      componentSubjectIds: true,
      amalgamationSubjectIds: true,
      visuallySimilarSubjectIds: true,
      meaningMnemonic: true,
      readingMnemonic: true,
    },
  });

  for (const row of rows) {
    found.set(row.wkSubjectId, {
      // `object` carries the WaniKani subject type; rows written before that was
      // stored only have `subjectType`, so fall back rather than losing it.
      object: row.object && row.object !== "subject" ? row.object : row.subjectType,
      data: {
        level: row.level,
        characters: row.characters,
        slug: row.slug,
        component_subject_ids: row.componentSubjectIds,
        amalgamation_subject_ids: row.amalgamationSubjectIds,
        visually_similar_subject_ids: row.visuallySimilarSubjectIds,
        meanings: (row.meanings as SubjectData["meanings"]) ?? undefined,
        readings: (row.readings as SubjectData["readings"]) ?? undefined,
        meaning_mnemonic: row.meaningMnemonic ?? undefined,
        reading_mnemonic: row.readingMnemonic ?? undefined,
      },
    });
  }

  return found;
}

export async function hydrateMissingSubjects(
  token: string,
  subjectById: Map<number, { object: string; data: SubjectData }>,
  subjectIds: number[],
): Promise<void> {
  const requested = subjectIds.filter((subjectId) => !subjectById.has(subjectId));

  /*
   * Catalog first. Opening the study queue asks for every subject related to
   * the visible page — components, amalgamations and visual look-alikes — which
   * runs to a couple of thousand ids. Fetching those from the API meant a chain
   * of sequential round trips that took 9-12 seconds of a 15 second request,
   * for subjects already sitting in the local catalog.
   */
  const fromCatalog = await fetchCatalogSubjects(requested);
  for (const [subjectId, row] of fromCatalog) {
    subjectById.set(subjectId, row);
  }

  const missingIds = requested.filter((subjectId) => !subjectById.has(subjectId));

  for (let i = 0; i < missingIds.length; i += ASSIGNMENT_CHUNK_SIZE) {
    const chunkIds = missingIds.slice(i, i + ASSIGNMENT_CHUNK_SIZE);
    if (chunkIds.length === 0) {
      continue;
    }

    const collection = await fetchAllCollectionPages(`/subjects?ids=${chunkIds.join(",")}`, token);
    for (const row of collection.data) {
      subjectById.set(row.id, {
        object: row.object ?? "subject",
        data: row.data as SubjectData,
      });
    }
  }
}

export function buildImmediateAssignmentsPath(mode: QueueMode, includeReviewed: boolean = false): string {
  return `/assignments?${modePathParam(mode, includeReviewed)}`;
}

export function toAssignmentRows(collection: WaniKaniCollectionResponse): AssignmentRow[] {
  return collection.data.map((row) => ({
    id: row.id,
    data: row.data as AssignmentData,
  }));
}

export function trimSubjectCache(input: Map<number, CachedSubjectRow>, activeSubjectIds: Set<number>): void {
  for (const subjectId of input.keys()) {
    if (!activeSubjectIds.has(subjectId)) {
      input.delete(subjectId);
    }
  }

  if (input.size <= SUBJECT_CACHE_MAX_ENTRIES) {
    return;
  }

  const sorted = Array.from(input.entries()).sort((a, b) => a[1].fetchedAtMs - b[1].fetchedAtMs);
  const toRemove = sorted.slice(0, Math.max(0, sorted.length - SUBJECT_CACHE_MAX_ENTRIES));
  for (const [subjectId] of toRemove) {
    input.delete(subjectId);
  }
}

export function queueRowsFromState(
  state: QueueSyncState,
  queueType: QueueType,
): Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }> {
  const rows: Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }> = [];

  for (const assignment of state.assignmentById.values()) {
    // "Lessons" in this UI means unstarted lessons. Once started, they should
    // move out of the lesson queue (even if WK still reports srs_stage=0).
    if (queueType === QUEUE_TYPES.lesson && assignment.data.started_at) {
      continue;
    }

    rows.push({
      assignmentId: assignment.id,
      data: assignment.data,
      queueType,
    });
  }

  return rows;
}

export async function fetchAssignmentCount(path: string, token: string): Promise<number> {
  const response = await fetchWaniKani<WaniKaniCollectionResponse>(path, token);
  return response.data?.total_count ?? 0;
}
