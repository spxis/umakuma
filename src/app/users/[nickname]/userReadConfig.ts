import type { TabId } from "./UserDashboardTabs.types";
import type { StudySrsFilter, StudySrsStageFilter, StudyTypeFilter } from "./study-explorer/lib/studyExplorerTypes";
import {
  isStudySrsFilterValue,
  isStudyTypeFilterValue,
  STUDY_SRS_FILTERS,
  STUDY_TYPE_FILTERS,
} from "./study-explorer/lib/studyExplorerDomain";

/**
 * Canonical name for each dashboard view. Used by the top navigation and by the
 * page heading, so the two cannot drift apart.
 */
export const DASHBOARD_TAB_LABELS: Record<TabId, string> = {
  learn: "Study",
  wk: "WaniKani",
  jlpt: "JLPT Explorer",
  stats: "Stats",
  news: "News",
  read: "Read",
};

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
  const srs = query.srs ?? null;
  if (isStudySrsFilterValue(srs)) {
    return srs;
  }

  return STUDY_SRS_FILTERS.all;
}

export function resolveInitialStudyFilters(query: QueryShape): {
  viewedLevel: number | null;
  typeFilter: StudyTypeFilter;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
} {
  const initialType = query.type ?? null;
  const typeFilter: StudyTypeFilter =
    isStudyTypeFilterValue(initialType)
      ? initialType
      : STUDY_TYPE_FILTERS.all;

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
    showLocked: query.hideLocked === "0",
  };
}

/**
 * Whether the address named a tab, as opposed to landing on the page.
 *
 * `resolveInitialDashboardTab` cannot answer this: it returns "learn" both for
 * `/study`, which asks for the study tab, and for the bare user page, which
 * asks for nothing and should reopen whichever tab the member last had. Told
 * apart, "go to study" works from anywhere; conflated, tapping Study while an
 * explorer is open changes the URL and leaves the explorer on screen - which
 * is a hard thing to report as a bug, because from the study page itself the
 * link looks like it works.
 */
export function dashboardTabWasAddressed(query: QueryShape): boolean {
  const named = [
    "study",
    "wk",
    "wk-explorer",
    "library-explorer",
    "jlpt",
    "jlpt-explorer",
    "learn",
    "news",
    "stats",
    "read",
  ];
  if (query.dashboard !== undefined && named.includes(query.dashboard)) {
    return true;
  }
  /* The older `tab` parameter, still in links and bookmarks. */
  return query.tab !== undefined && ["level", "jlpt", "read", "news", "stats"].includes(query.tab);
}

export function resolveInitialDashboardTab(query: QueryShape): TabId {
  if (query.dashboard === "study") return "learn";
  /* What the `/study` rewrite actually sends; it fell through to the default. */
  if (query.dashboard === "learn") return "learn";
  if (query.dashboard === "wk") return "wk";
  if (query.dashboard === "wk-explorer") return "wk";
  if (query.dashboard === "library-explorer") return "wk";
  if (query.dashboard === "jlpt") return "jlpt";
  if (query.dashboard === "jlpt-explorer") return "jlpt";
  if (query.dashboard === "news") return "news";
  if (query.dashboard === "stats") return "stats";
  if (query.dashboard === "read") return "read";
  if (query.tab === "level") return "wk";
  if (query.tab === "jlpt") return "jlpt";
  if (query.tab === "read") return "news";
  if (query.tab === "news") return "news";
  if (query.tab === "stats") return "stats";
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
