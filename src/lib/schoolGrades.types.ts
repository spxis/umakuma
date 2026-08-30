export type SchoolGradeCategory = "elementary" | "secondary" | "name_kanji" | "name_variant";

export interface KanjiCategoryInfo {
  code: SchoolGradeCategory;
  name: string;
  nameJa: string;
  abbr: string;
}

export interface SchoolGradeReadings {
  on: string[];
  kun: string[];
  nanori?: string[];
}

export interface SchoolGradeCrossRef {
  jlptLevel: number | null;
  wanikaniLevel: number | null;
}

export interface SchoolGradeKanjiEntry {
  kanji: string;
  grade: number;
  category: KanjiCategoryInfo;
  strokeCount: number | null;
  frequencyRank: number | null;
  unicodeHex: string | null;
  primaryMeaning: string | null;
  meanings: string[];
  readings: SchoolGradeReadings;
  gradeApprovedReadings?: SchoolGradeReadings;
  heisigKeyword: string | null;
  crossRef?: SchoolGradeCrossRef;
}

export interface SchoolGradeCurriculumMeta {
  standard: string;
  enforcementYear: number;
  objective: string;
}

export interface SchoolGradeFilePayload {
  grade: number;
  slug: string;
  name: string;
  nameJa: string;
  category: SchoolGradeCategory;
  totalCount: number;
  curriculum: SchoolGradeCurriculumMeta;
  readingsStandard: string;
  updatedAt: string;
  kanji: SchoolGradeKanjiEntry[];
}

export interface SchoolGradeMetaHeader {
  grade: number;
  slug: string;
  name: string;
  nameJa: string;
  category: SchoolGradeCategory;
  totalCount: number;
  curriculum: SchoolGradeCurriculumMeta;
  readingsStandard: string;
  updatedAt: string;
}

export interface SchoolGradeIndexItem extends SchoolGradeMetaHeader {
  filePath: string;
}

export interface SchoolGradeIndexPayload {
  exportedAt?: string;
  updatedAt: string;
  standard?: string;
  readingsStandard?: string;
  levels?: number;
  totalKanjiCount: number;
  elementaryKanjiCount: number;
  secondaryKanjiCount: number;
  nameKanjiCount: number;
  outputDir?: string;
  files?: string[];
  grades: SchoolGradeIndexItem[];
}

export type SchoolGradeSortBy = "grade" | "strokeCount" | "frequency" | "unicode" | "kanji";
export type SchoolGradeSortDir = "asc" | "desc";

export interface SchoolGradeCatalogQuery {
  page: number;
  pageSize: number;
  grade?: number | "all";
  category?: SchoolGradeCategory | "all";
  search?: string | null;
  strokeMin?: number | null;
  strokeMax?: number | null;
  sortBy: SchoolGradeSortBy;
  sortDir: SchoolGradeSortDir;
}

export interface SchoolGradeCatalogPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SchoolGradeCatalogResponse {
  pagination: SchoolGradeCatalogPagination;
  items: SchoolGradeKanjiEntry[];
  meta?: SchoolGradeMetaHeader;
}
