import type { SrsFilter } from "../../explorerTypes";
import type { JlptFilter, ReviewTimingFilter, TypeVisibility } from "../lib/levelExplorerState";
import type { SubjectType } from "@/lib/domainConstants";
import type { LevelItemCounts, LevelJlptCounts, ReviewTimingCounts } from "../lib/levelExplorerSelectors";

export type LevelExplorerFilterPanelProps = {
  levelOptions: number[];
  levelItemCountsByLevel: Record<number, number>;
  selectedLevels: Set<number>;
  searchAvailableLevels: Set<number> | null;
  visibleTypes: TypeVisibility;
  counts: LevelItemCounts;
  jlptCounts: LevelJlptCounts;
  reviewTimingCounts: ReviewTimingCounts;
  accountPendingReviews: number;
  overdueOutsideSelectedLevels: number;
  srsFilter: SrsFilter;
  jlptFilter: JlptFilter;
  reviewTimingFilter: ReviewTimingFilter;
  onClearAllFilters: () => void;
  onSelectAllLevelsAndClearSearch: () => Promise<void>;
  onToggleLevel: (level: number) => Promise<void>;
  onEnableAllTypes: () => void;
  onToggleTypeVisibility: (type: SubjectType) => void;
  onSetSrsFilter: (next: SrsFilter) => void;
  onSetJlptFilter: (next: JlptFilter) => void;
  onSetReviewTimingFilter: (next: ReviewTimingFilter) => void;
};
