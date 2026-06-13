import type { CatalogCategoryFilter, CatalogSortBy, CatalogSubjectTypeFilter } from "@/lib/wanikani/catalogBrowseTypes";

export type AdminCatalogBrowserProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
};

export type CatalogBrowseClientQuery = {
  page: number;
  pageSize: number;
  type: CatalogSubjectTypeFilter;
  category: CatalogCategoryFilter;
  levelMin: number | null;
  levelMax: number | null;
  sortBy: CatalogSortBy;
  sortDir: "asc" | "desc";
  search: string | null;
};
