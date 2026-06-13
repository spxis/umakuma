import type { SubjectType } from "@/lib/domainConstants";

export const CATALOG_SUBJECT_TYPE_FILTERS = ["all", "radical", "kanji", "vocabulary"] as const;
export type CatalogSubjectTypeFilter = (typeof CATALOG_SUBJECT_TYPE_FILTERS)[number];

export const CATALOG_CATEGORY_FILTERS = ["all", "active", "hidden", "character", "imageBased"] as const;
export type CatalogCategoryFilter = (typeof CATALOG_CATEGORY_FILTERS)[number];

export type CatalogRowCategory = "active" | "hidden" | "character" | "imageBased";

export const CATALOG_SORT_BY = ["level", "subjectType", "wkSubjectId", "slug", "characters", "dataUpdatedAt", "updatedAt"] as const;
export type CatalogSortBy = (typeof CATALOG_SORT_BY)[number];

export const CATALOG_SORT_DIR = ["asc", "desc"] as const;
export type CatalogSortDir = (typeof CATALOG_SORT_DIR)[number];

export type CatalogBrowseQuery = {
  page: number;
  pageSize: number;
  type: CatalogSubjectTypeFilter;
  category: CatalogCategoryFilter;
  levelMin: number | null;
  levelMax: number | null;
  sortBy: CatalogSortBy;
  sortDir: CatalogSortDir;
  search: string | null;
};

export type CatalogBrowseRow = {
  wkSubjectId: number;
  subjectType: SubjectType;
  level: number;
  slug: string | null;
  characters: string | null;
  primaryMeaning: string | null;
  category: CatalogRowCategory;
  hiddenAt: string | null;
  dataUpdatedAt: string;
  updatedAt: string;
  documentUrl: string | null;
};

export type CatalogBrowseResponse = {
  now: string;
  filters: {
    applied: CatalogBrowseQuery;
    facets: {
      byType: Record<CatalogSubjectTypeFilter, number>;
      byCategory: Record<CatalogCategoryFilter, number>;
      levelBounds: {
        min: number | null;
        max: number | null;
      };
    };
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  totals: {
    overallSubjects: number;
    filteredSubjects: number;
  };
  items: CatalogBrowseRow[];
  meta: {
    cacheHit: boolean;
    cacheTtlMs: number;
    generatedAt: string;
  };
};
