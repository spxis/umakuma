import type { LevelItem, SrsFilter } from "../../explorerTypes";
import type { QueueType, SubjectType, WkStatus } from "@/lib/domainConstants";

export type StudyQueueItem = LevelItem & {
  assignmentId: number;
  queueType: QueueType;
};

export type StudyQueueMode = StudyQueueItem["queueType"];
export type StudyViewerMode = "detail" | "flash";
export type StudySource = "wanikani" | "custom";

export type QueueResponse = {
  cached?: boolean;
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
  srsCounts?: {
    all: number;
    locked: number;
    apprentice: number;
    guru: number;
    master: number;
    enlightened: number;
    burned: number;
  };
  srsStageCounts?: Record<number, number>;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

export type UpcomingReviewItem = {
  subjectId: number;
  subjectType: SubjectType;
  wkLevel: number | null;
  characters: string;
  primaryMeaning: string | null;
  primaryReading: string | null;
  availableAt: string;
};

export type UpcomingReviewsResponse = {
  items: UpcomingReviewItem[];
  totalUpcoming: number;
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

export type ReviewSrsGrouping = WkStatus;

export type ReviewSrsTransition = {
  assignmentId: number;
  subjectId: number | null;
  previousSrsStage: number | null;
  newSrsStage: number | null;
  previousGrouping: ReviewSrsGrouping | null;
  newGrouping: ReviewSrsGrouping | null;
  transition: "promoted" | "demoted" | "unchanged" | "unknown";
};

export type SubmitInFlight = {
  assignmentId: number;
  result: "correct" | "wrong" | "start-lesson" | "reset-to-lessons";
  itemLabel: string;
};

export type ReviewOutcome = "correct" | "wrong" | "skipped" | "lesson-started" | "reset-to-lessons";
export type StudyReviewSubmitResult = Extract<ReviewOutcome, "correct" | "wrong">;

export type StudyExplorerProps = {
  accountId: string;
  studySource: StudySource;
  customLibraryId: string | null;
  studySourceHeaderLabel: string;
  studySourceIsCustom: boolean;
  studySourceLevel: number | null;
  onOpenStudySourceManager: () => void;
  maxLevel: number;
  showEnglish: boolean;
  onToggleShowEnglish: () => void;
  canToggleEnglish: boolean;
  studyMode: boolean;
  queueMode: StudyQueueMode;
  initialViewerMode?: StudyViewerMode | null;
  initialFilters?: {
    viewedLevel: number | null;
    typeFilter: StudyTypeFilter;
    srsFilter: StudySrsFilter;
    srsStageFilter: StudySrsStageFilter | null;
    recentOnly: boolean;
    showLocked: boolean;
  };
};

export type StudyTypeFilter = "all" | SubjectType;
export type StudySrsFilter = Extract<
  SrsFilter,
  "all" | WkStatus
>;

export type StudySrsStageFilter = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type StudyWaitSortOrder = "oldest_wait" | "newest_wait";
