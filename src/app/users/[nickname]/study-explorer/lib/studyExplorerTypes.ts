import type { LevelItem } from "../../explorerTypes";
import { STUDY_SRS_FILTERS } from "./studyExplorerConstants";
import type { StudyQueueMode } from "./studyExplorerConstants";

export type StudyQueueItem = LevelItem & {
  assignmentId: number;
  queueType: StudyQueueMode;
};

export type QueueResponse = {
  items: StudyQueueItem[];
  counts: {
    all: number;
    reviews: number;
    lessons: number;
  };
  levelCounts?: Record<number, number>;
  typeCounts?: {
    all: number;
    radical: number;
    kanji: number;
    vocabulary: number;
  };
  typeCountsByLevel?: Record<
    number,
    {
      all: number;
      radical: number;
      kanji: number;
      vocabulary: number;
    }
  >;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

export type StudyCounts = QueueResponse["counts"];

export type StoredQueuePayload = {
  cachedAtMs: number;
  data: QueueResponse;
};

export type SubmitFeedback = {
  kind: "success" | "error";
  message: string;
};

export type SubmitInFlight = {
  assignmentId: number;
  result: "correct" | "wrong" | "start-lesson";
  itemLabel: string;
};

export type ReviewOutcome = "correct" | "wrong" | "skipped" | "lesson-started";

export type StudyExplorerProps = {
  accountId: string;
  maxLevel: number;
  showEnglish: boolean;
  onToggleShowEnglish: () => void;
  canToggleEnglish: boolean;
  studyMode: boolean;
  queueMode: StudyQueueMode;
};

export type StudyTypeFilter = "all" | "radical" | "kanji" | "vocabulary";
export type StudySrsFilter = (typeof STUDY_SRS_FILTERS)[number];
