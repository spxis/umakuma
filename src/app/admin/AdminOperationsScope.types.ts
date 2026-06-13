export type AdminOperationsScopeResponse = {
  generatedAt: string;
  counts: {
    accountsTotal: number;
    wkCatalogTotal: number;
    jlptTotal: number;
    jlptMissingEnrichment: number;
  };
  estimates: {
    refreshAllMinutes: number;
    jlptRefreshMinutes: number;
    jlptEnrichBatchSize: number;
    jlptEnrichRemainingBatches: number;
    fullCatalogSyncMinutes: number;
    incrementalCatalogSyncMinutes: number;
  };
};
