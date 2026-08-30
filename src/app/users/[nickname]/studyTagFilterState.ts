import { STUDY_TAGS } from "@/lib/domainConstants";

import { STUDY_PANEL_TEXT } from "./study-explorer/components/StudyExplorer.constants";
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

/**
 * The chip copy for an active tag filter, or `null` when nothing is narrowing
 * the queue. Kept here rather than in the component so the mapping is covered
 * without a DOM.
 */
export function studyTagFilterLabel(filter: StudyTagFilter): string | null {
  if (filter === STUDY_TAGS.trouble) {
    return STUDY_PANEL_TEXT.tagFilterTroubleOnly;
  }

  if (filter === STUDY_TAGS.favorite) {
    return STUDY_PANEL_TEXT.tagFilterFavouritesOnly;
  }

  return null;
}
