import type { LevelItem, SrsFilter } from "../../explorerTypes";
import type { JlptFilter, ReviewTimingFilter, TypeVisibility } from "../lib/levelExplorerState";
import type {
  LevelItemCounts,
  LevelJlptCounts,
  ReviewTimingCounts,
} from "../lib/levelExplorerSelectors";

export type VocabularyKanjiLink = {
  char: string;
  subjectId: number;
  reading: string;
  wkLevel: number | null;
};

export type LevelExplorerContentProps = {
  accountId: string;
  levelOptions: number[];
  selectedLevels: Set<number>;
  searchAvailableLevels: Set<number> | null;
  stickyMerge: boolean;
  visibleTypes: TypeVisibility;
  counts: LevelItemCounts;
  jlptCounts: LevelJlptCounts;
  reviewTimingCounts: ReviewTimingCounts;
  accountPendingReviews: number;
  overdueOutsideSelectedLevels: number;
  combinedItemLength: number;
  combinedKanjiLearned: number;
  combinedKanjiLocked: number;
  selectedLevelList: number[];
  filtersCollapsed: boolean;
  srsFilter: SrsFilter;
  jlptFilter: JlptFilter;
  reviewTimingFilter: ReviewTimingFilter;
  showEnglish: boolean;
  studyMode: boolean;
  loading: boolean;
  gridColumns: number;
  searchMatchedSubjectIds: Set<number> | null;
  error: string;
  filteredItems: LevelItem[];
  selectedItem: LevelItem | null;
  selectedMeaningExplanation: string;
  selectedReadingExplanationRaw: string;
  showReadingExplanation: boolean;
  hasPrimaryRelatedPanel: boolean;
  hasVisuallySimilarPanel: boolean;
  hasUsedInVocabularyPanel: boolean;
  vocabularyKanjiLinks: VocabularyKanjiLink[];
  subjectById: Map<number, LevelItem>;
  onSelectAllLevelsAndClearSearch: () => Promise<void>;
  onToggleLevel: (level: number) => Promise<void>;
  onSetStickyMerge: (next: boolean) => void;
  onEnableAllTypes: () => void;
  onToggleTypeVisibility: (type: "radical" | "kanji" | "vocabulary") => void;
  onSetFiltersCollapsed: (next: boolean) => void;
  onSetSrsFilter: (next: SrsFilter) => void;
  onSetJlptFilter: (next: JlptFilter) => void;
  onSetReviewTimingFilter: (next: ReviewTimingFilter) => void;
  onSetSelectedSubjectId: (next: number | null | ((prev: number | null) => number | null)) => void;
  onJumpToRelatedSubject: (subjectId: number, targetLevel?: number | null) => Promise<void>;
  onJumpToKanji: (subjectId: number, wkLevel: number | null) => Promise<void>;
  onMarkHistoryPush: () => void;
};
