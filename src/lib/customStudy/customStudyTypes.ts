import type { CustomStudyItemType } from "@prisma/client";

export type CustomLibraryImportPayload = {
  schemaVersion: 1;
  library: {
    id: string;
    name: string;
    description?: string;
  };
  items: CustomLibraryItemPayload[];
};

export type CustomLibraryItemPayload = {
  id: string;
  type: CustomStudyItemType;
  characters: string;
  meanings: string[];
  readings?: string[];
  primaryReading?: string;
  meaningMnemonic?: string;
  readingMnemonic?: string;
  synonyms?: string[];
  notes?: string;
};

export type CustomLibraryListRow = {
  id: string;
  externalKey: string;
  name: string;
  description: string | null;
  itemCount: number;
  isActive: boolean;
  lastImportedAt: string;
};

export type CustomLibraryImportSummary = {
  libraryId: string;
  externalKey: string;
  libraryName: string;
  createdLibrary: boolean;
  importedCount: number;
  createdCount: number;
  updatedCount: number;
  removedCount: number;
};
