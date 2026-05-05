import type { TabId } from "./UserDashboardTabs.types";
import type { StudySrsFilter, StudySrsStageFilter, StudyTypeFilter } from "./study-explorer/lib/studyExplorerTypes";

type QueryShape = {
  dashboard?: string;
  tab?: string;
  read?: string;
  srs?: string;
  type?: string;
  level?: string;
  srsStage?: string;
  recent?: string;
  hideLocked?: string;
};

type ReadTab = "news" | "history" | "stats";

export function resolveInitialSrsFilter(query: QueryShape): StudySrsFilter {
  if (
    query.srs === "locked"
    || query.srs === "apprentice"
    || query.srs === "guru"
    || query.srs === "master"
    || query.srs === "enlightened"
    || query.srs === "burned"
  ) {
    return query.srs;
  }

  return "all";
}

export function resolveInitialStudyFilters(query: QueryShape): {
  viewedLevel: number | null;
  typeFilter: StudyTypeFilter;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
} {
  const typeFilter: StudyTypeFilter =
    query.type === "radical" || query.type === "kanji" || query.type === "vocabulary"
      ? query.type
      : "all";

  const parsedStudyLevel = Number(query.level ?? "");
  const viewedLevel = Number.isInteger(parsedStudyLevel) && parsedStudyLevel > 0
    ? parsedStudyLevel
    : null;

  const parsedStudySrsStage = Number(query.srsStage ?? "");
  const srsStageFilter = Number.isInteger(parsedStudySrsStage)
    && parsedStudySrsStage >= 1
    && parsedStudySrsStage <= 9
    ? (parsedStudySrsStage as StudySrsStageFilter)
    : null;

  return {
    viewedLevel,
    typeFilter,
    srsFilter: resolveInitialSrsFilter(query),
    srsStageFilter,
    recentOnly: query.recent === "1",
    showLocked: query.hideLocked !== "1",
  };
}

export function resolveInitialDashboardTab(query: QueryShape): TabId {
  if (query.dashboard === "stats") return "stats";
  if (query.dashboard === "read") return "read";
  if (query.tab === "stats") return "stats";
  if (query.tab === "read") return "read";
  return "learn";
}

export function resolveInitialReadTab(query: QueryShape): ReadTab {
  if (query.read === "history") return "history";
  if (query.read === "stats") return "stats";
  return "news";
}

export function getNewsDevSampleUrls(): string[] {
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  const raw = process.env.NEWS_DEV_SAMPLE_URLS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
