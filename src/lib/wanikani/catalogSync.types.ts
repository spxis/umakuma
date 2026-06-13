import type { Prisma } from "@prisma/client";

export type CatalogSyncMode = "full" | "incremental";

export type RunCatalogSyncOptions = {
  mode: CatalogSyncMode;
  apply?: boolean;
  resume?: boolean;
  maxPages?: number | null;
  token?: string | null;
  accountLike?: string;
  updatedAfterOverride?: Date | null;
};

export type CatalogSyncResult = {
  mode: CatalogSyncMode;
  applied: boolean;
  tokenSource: string;
  pagesProcessed: number;
  fetchedCount: number;
  upsertedCount: number;
  changedCount: number;
  skippedCount: number;
  parseErrorCount: number;
  durationMs: number;
  cursorDataUpdatedAt: string | null;
  cursorSubjectId: number | null;
  resumePath: string | null;
  runId: string | null;
};

export type SubjectUpsertRow = {
  wkSubjectId: number;
  object: string;
  subjectType: string;
  level: number;
  slug: string | null;
  characters: string | null;
  documentUrl: string | null;
  dataUpdatedAt: Date;
  hiddenAt: Date | null;
  meanings: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
  readings: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
  meaningMnemonic: string | null;
  meaningHint: string | null;
  readingMnemonic: string | null;
  readingHint: string | null;
  rawData: Prisma.InputJsonValue;
};

export type ResolvedToken = {
  token: string;
  source: string;
};

export type ProgressStats = {
  mode: "apply" | "dry-run";
  syncType: CatalogSyncMode;
  pagesProcessed: number;
  fetchedCount: number;
  upsertedCount: number;
  changedCount: number;
  skippedCount: number;
  parseErrorCount: number;
  fullResumePath: string | null;
  incrementalResumePath: string | null;
  cursorDataUpdatedAt: string | null;
  cursorSubjectId: number | null;
  updatedAt: string;
};
