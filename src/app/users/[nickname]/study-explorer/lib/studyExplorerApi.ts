import type { StudyQueueMode, StudySource } from "./studyExplorerTypes";
import { STUDY_QUEUE_TYPES } from "./studyExplorerDomain";

export function buildStudyApiBasePath(accountId: string, studySource: StudySource): string {
  return studySource === "custom" ? `/api/custom-study/${accountId}` : `/api/study/${accountId}`;
}

export function buildStudyQueueStorageScopeKey(
  studySource: StudySource,
  customLibraryId: string | null,
): string {
  return `${studySource}:${customLibraryId ?? "none"}`;
}

export function buildStudyQueueRequestUrl(params: {
  studyApiBasePath: string;
  queueMode: StudyQueueMode;
  initialPageSize: number;
  studySource: StudySource;
  customLibraryId: string | null;
  includeTrouble: boolean;
  queueTagFilter?: "all" | "favorite" | "trouble";
}): string | null {
  if (params.studySource === "custom" && !params.customLibraryId) {
    return null;
  }

  const query = new URLSearchParams({
    mode: params.queueMode,
    limit: String(params.initialPageSize),
    offset: "0",
  });
  if (params.customLibraryId) {
    query.set("libraryId", params.customLibraryId);
  }
  if (params.queueMode === STUDY_QUEUE_TYPES.review) {
    query.set("includeTrouble", params.includeTrouble ? "1" : "0");
  }
  if (params.queueTagFilter && params.queueTagFilter !== "all") {
    query.set("tag", params.queueTagFilter);
  }

  return `${params.studyApiBasePath}/queue?${query.toString()}`;
}

export function buildStudyUpcomingRequestUrl(params: {
  studyApiBasePath: string;
  studySource: StudySource;
  customLibraryId: string | null;
  limit?: number;
}): string | null {
  if (params.studySource === "custom" && !params.customLibraryId) {
    return null;
  }

  const query = new URLSearchParams();
  if (params.customLibraryId) {
    query.set("libraryId", params.customLibraryId);
  }
  if (typeof params.limit === "number" && Number.isInteger(params.limit) && params.limit > 0) {
    query.set("limit", String(params.limit));
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `${params.studyApiBasePath}/upcoming${suffix}`;
}
