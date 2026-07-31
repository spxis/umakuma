import type { WkStatus } from "@/lib/domainConstants";
import type { LevelItem } from "@/lib/glyphTypes";
import type { JlptKanjiRow } from "@/lib/jlptTypes";

export type { LevelItem, RelatedReference } from "@/lib/glyphTypes";

export type Snapshot = {
  level: number;
  kanjiTotal: number;
  kanjiLearned: number;
  kanjiGuruPlus: number;
  kanjiLocked: number;
  estimatedHoursRemaining: number | null;
  items: LevelItem[];
  syncedAt?: string;
};

export type JlptItem = JlptKanjiRow;

export type UserKanjiItem = {
  subjectId?: number;
  characters: string;
  meanings?: string[];
  primaryReadings?: string[];
  readings?: string[];
  meaningExplanation?: string;
  readingExplanation?: string;
  startedAt?: string | null;
  passedAt?: string | null;
  availableAt?: string | null;
  status?: WkStatus;
  srsStage?: number;
  wkLevel?: number | null;
  successRate?: number;
};

export type SrsFilter =
  | "all"
  | WkStatus;
