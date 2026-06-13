export const JLPT_CATALOG_SORT_BY = ["nLevel", "kanji", "updatedAt", "enrichedAt"] as const;
export type JlptCatalogSortBy = (typeof JLPT_CATALOG_SORT_BY)[number];

export const JLPT_CATALOG_SORT_DIR = ["asc", "desc"] as const;
export type JlptCatalogSortDir = (typeof JLPT_CATALOG_SORT_DIR)[number];

export const JLPT_CATALOG_ENRICHMENT_FILTERS = ["all", "enriched", "missing"] as const;
export type JlptCatalogEnrichmentFilter = (typeof JLPT_CATALOG_ENRICHMENT_FILTERS)[number];

export type JlptCatalogQuery = {
  page: number;
  pageSize: number;
  nLevel: number | null;
  enrichment: JlptCatalogEnrichmentFilter;
  search: string | null;
  sortBy: JlptCatalogSortBy;
  sortDir: JlptCatalogSortDir;
};

export type JlptCatalogRow = {
  kanji: string;
  nLevel: number;
  primaryMeaning: string | null;
  meaningsCount: number;
  onReadingsCount: number;
  kunReadingsCount: number;
  nanoriReadingsCount: number;
  strokeCount: number | null;
  frequencyRank: number | null;
  sourceJlpt: number | null;
  enrichedAt: string | null;
  updatedAt: string;
};

export type JlptCatalogSummary = {
  totalRows: number;
  filteredRows: number;
  missingEnrichmentRows: number;
  byLevel: Record<number, number>;
};

export type JlptCatalogJsonSourceMeta = {
  path: string;
  generatedBy: string;
  updatedAt: string | null;
  entryCount: number;
  refreshHint: string;
};

export type JlptCatalogResponse = {
  now: string;
  query: JlptCatalogQuery;
  summary: JlptCatalogSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  items: JlptCatalogRow[];
  jsonSource: JlptCatalogJsonSourceMeta;
  meta: {
    cacheHit: boolean;
    cacheTtlMs: number;
    generatedAt: string;
    destructive: false;
  };
};
