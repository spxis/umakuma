import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";
import type {
  CatalogCategoryFilter,
  CatalogSortBy,
  CatalogSubjectTypeFilter,
} from "@/lib/wanikani/catalogBrowseTypes";

import type { CatalogBrowseClientQuery } from "./AdminCatalogBrowser.types";

export const PAGE_SIZE_OPTIONS = [20, 40, 80] as const;

export const SORT_LABELS: Record<CatalogSortBy, string> = {
  level: "Level",
  subjectType: "Type",
  wkSubjectId: "Subject id",
  slug: "Slug",
  characters: "Characters",
  dataUpdatedAt: "Data updated",
  updatedAt: "Row updated",
};

export const CATEGORY_LABELS: Record<CatalogCategoryFilter, string> = {
  all: "All",
  active: "Active",
  hidden: "Hidden",
  character: "Character",
  imageBased: "Image based",
};

export const TYPE_LABELS: Record<CatalogSubjectTypeFilter, string> = {
  all: "All",
  [SUBJECT_TYPES.radical]: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural,
  [SUBJECT_TYPES.kanji]: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].plural,
  [SUBJECT_TYPES.vocabulary]: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].plural,
};

export function typeBadgeClass(subjectType: string): string {
  if (subjectType === SUBJECT_TYPES.radical) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (subjectType === SUBJECT_TYPES.kanji) {
    return "border-pink-200 bg-pink-50 text-pink-800";
  }

  return "border-violet-200 bg-violet-50 text-violet-800";
}

export function categoryBadgeClass(category: string): string {
  if (category === "hidden") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (category === "imageBased") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (category === "character") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-line bg-surface-muted text-foreground/80";
}

export function sortIndicator(activeSortBy: CatalogSortBy, activeSortDir: "asc" | "desc", columnSortBy: CatalogSortBy): string {
  if (activeSortBy !== columnSortBy) {
    return "<>";
  }

  return activeSortDir === "asc" ? "^" : "v";
}

export function parseLevelInput(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return Math.min(parsed, 60);
}

export function buildBrowseUrl(query: CatalogBrowseClientQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    type: query.type,
    category: query.category,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });

  if (query.levelMin !== null) {
    params.set("levelMin", String(query.levelMin));
  }

  if (query.levelMax !== null) {
    params.set("levelMax", String(query.levelMax));
  }

  if (query.search) {
    params.set("search", query.search);
  }

  return `/api/admin/wk-catalog/subjects?${params.toString()}`;
}
