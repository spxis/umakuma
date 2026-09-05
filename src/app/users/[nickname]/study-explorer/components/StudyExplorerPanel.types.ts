import type { StudyTag } from "@/lib/domainConstants";
import type { RefObject } from "react";
import type {
  StudySource,
  UpcomingReviewItem,
  StudyQueueItem,
  StudyQueueMode,
  StudySrsFilter,
  StudySrsStageFilter,
  StudyTagFilter,
  StudyTypeFilter,
  StudyWaitSortOrder,
} from "../lib/studyExplorerTypes";

type StudyExplorerPanelProps = {
  accountId: string;
  canToggleEnglish: boolean;
  showEnglish: boolean;
  studyMode: boolean;
  studySourceHeaderLabel: string;
  studySource: StudySource;
  studySourceIsCustom: boolean;
  studySourceLevel: number | null;
  levelOptions: number[];
  availableLevels: Set<number>;
  reviewLevelCounts: Record<number, number>;
  viewedLevel: number | null;
  typeFilter: StudyTypeFilter;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  queueMode: StudyQueueMode;
  queueTagFilter: StudyTagFilter;
  lessonLevelCounts: Record<number, number>;
  typeCounts: { all: number; radical: number; kanji: number; vocabulary: number };
  srsCounts: { all: number; locked: number; apprentice: number; guru: number; master: number; enlightened: number; burned: number };
  srsStageCounts: Record<number, number>;
  filteredItems: StudyQueueItem[];
  totalItems: number;
  hasMorePages: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  isAwaitingInitialQueueState: boolean;
  isLoading: boolean;
  isValidating: boolean;
  hasData: boolean;
  isUnauthorized: boolean;
  errorMessage: string | null;
  showUpcomingReviews: boolean;
  upcomingItems: UpcomingReviewItem[];
  isLoadingUpcomingReviews: boolean;
  upcomingErrorMessage: string | null;
  waitSortOrder: StudyWaitSortOrder;
  gridColumns: number;
  cacheFooterText: string;
  cacheFooterTitle: string;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onSetViewedLevel: (level: number | null) => void;
  onSetTypeFilter: (filter: StudyTypeFilter) => void;
  onSetSrsFilter: (filter: StudySrsFilter) => void;
  onSetSrsStageFilter: (filter: StudySrsStageFilter | null) => void;
  onToggleShowEnglish: () => void;
  onToggleShowUpcomingReviews: () => void;
  onOpenStudySourceManager: () => void;
  onSetWaitSortOrder: (sortOrder: StudyWaitSortOrder) => void;
  onSelectSubject: (subjectId: number) => void;
  onToggleStudyTag: (subjectId: number, tag: StudyTag, enabled: boolean) => void;
  onClearAllFilters: () => void;
  onClearQueueTagFilter: () => void;
};

export type { StudyExplorerPanelProps };