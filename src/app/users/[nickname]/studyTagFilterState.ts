import type { StudyTagFilter } from "./study-explorer/lib/studyExplorerTypes";

export function parseStudyTagFilter(value: string | null): StudyTagFilter | null {
  if (value === "all" || value === "favorite" || value === "trouble") {
    return value;
  }

  return null;
}

export function resolveStudyTagFilter(
  params: URLSearchParams,
  storedValue: string | null,
): StudyTagFilter {
  return parseStudyTagFilter(params.get("tag")) ?? parseStudyTagFilter(storedValue) ?? "all";
}
