import type { RefObject } from "react";
import type {
  StudyQueueItem,
  StudyQueueMode,
  StudySrsFilter,
  StudySrsStageFilter,
  StudyTypeFilter,
  StudyWaitSortOrder,
} from "../lib/studyExplorerTypes";

type StudyExplorerPanelProps = {
  canToggleEnglish: boolean;
  showEnglish: boolean;
  studyMode: boolean;
  levelOptions: number[];
  availableLevels: Set<number>;
  reviewLevelCounts: Record<number, number>;
  viewedLevel: number | null;
  typeFilter: StudyTypeFilter;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  queueMode: StudyQueueMode;
  lessonLevelCounts: Record<number, number>;
  typeCounts: { all: number; radical: number; kanji: number; vocabulary: number };
  srsCounts: { all: number; locked: number; apprentice: number; guru: number; master: number; enlightened: number; burned: number };
  srsStageCounts: Record<number, number>;
  filteredItems: StudyQueueItem[];
  totalItems: number;
  hasMorePages: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  isLoading: boolean;
  isValidating: boolean;
  hasData: boolean;
  isUnauthorized: boolean;
  errorMessage: string | null;
  showLocked: boolean;
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
  onToggleShowLocked: () => void;
  onSetWaitSortOrder: (sortOrder: StudyWaitSortOrder) => void;
  onSelectSubject: (subjectId: number) => void;
  onClearAllFilters: () => void;
};

export type { StudyExplorerPanelProps };