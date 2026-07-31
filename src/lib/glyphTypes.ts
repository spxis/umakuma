import type { SubjectType, WkStatus } from "@/lib/domainConstants";
import type { JlptMeta } from "@/lib/jlptTypes";

export type RelatedReference = {
  subjectId: number;
  label: string;
  wkLevel?: number | null;
  successRate?: number;
  reading?: string | null;
  meaning?: string | null;
};

export type LevelItem = {
  subjectId: number;
  subjectType?: SubjectType;
  wkLevel?: number;
  successRate?: number;
  characters: string;
  meanings: string[];
  readings?: string[];
  primaryReadings?: string[];
  radicals?: RelatedReference[];
  visuallySimilar?: RelatedReference[];
  usedInVocabulary?: RelatedReference[];
  componentKanji?: RelatedReference[];
  meaningExplanation?: string;
  readingExplanation?: string;
  jlptLevel?: number | null;
  jlptMeta?: JlptMeta | null;
  srsStage: number;
  status: WkStatus;
  startedAt?: string | null;
  passedAt?: string | null;
  availableAt: string | null;
  isInjectedTrouble?: boolean;
  studyTags?: {
    favorite: boolean;
    trouble: boolean;
  };
};
