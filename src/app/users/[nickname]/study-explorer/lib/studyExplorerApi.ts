import type { StudyQueueMode, StudySource } from "./studyExplorerTypes";

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

  return `${params.studyApiBasePath}/queue?${query.toString()}`;
}
