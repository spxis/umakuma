import type { StudySource } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";
import { useMemo, useState } from "react";

import type { Snapshot, SrsFilter } from "../../explorerTypes";
import { normalizeSnapshot } from "./levelExplorerSnapshotUtils";
import {
  LEVEL_JLPT_FILTERS,
  LEVEL_REVIEW_TIMING_FILTERS,
  LEVEL_TYPE_FILTERS,
  type JlptFilter,
  type ReviewTimingFilter,
  type TypeFilter,
} from "./levelExplorerState";

type UseLevelExplorerControllerStateArgs = {
  explorerSource: StudySource;
  maxLevel: number;
  initialSnapshot: Snapshot;
  initialSrsFilter: SrsFilter;
  forceShowLocked: boolean;
};

// Builds and owns all client-side state for the level explorer controller: the
// derived initial values (based on props) plus every useState slot that the
// controller, its handlers, and its effects read and write.
export function useLevelExplorerControllerState({
  explorerSource,
  maxLevel,
  initialSnapshot,
  initialSrsFilter,
  forceShowLocked,
}: UseLevelExplorerControllerStateArgs) {
  const initialClientState = useMemo(
    () => ({
      selectedLevels: new Set<number>(
        explorerSource === "custom"
          ? Array.from({ length: Math.max(1, maxLevel) }, (_, index) => index + 1)
          : [initialSnapshot.level],
      ),
      srsFilter: initialSrsFilter,
      typeFilter: LEVEL_TYPE_FILTERS.all as TypeFilter,
      jlptFilter: LEVEL_JLPT_FILTERS.all as JlptFilter,
      reviewTimingFilter: LEVEL_REVIEW_TIMING_FILTERS.all as ReviewTimingFilter,
      recentOnly: false,
      stickyMerge: false,
      selectedSubjectId: initialSnapshot.items[0]?.subjectId ?? null,
      visibleTypes: { radical: true, kanji: true, vocabulary: true },
      filtersCollapsed: false,
      showLocked: forceShowLocked,
    }),
    [explorerSource, forceShowLocked, initialSnapshot.items, initialSnapshot.level, initialSrsFilter, maxLevel],
  );

  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(initialClientState.selectedLevels);
  const [snapshotsByLevel, setSnapshotsByLevel] = useState<Map<number, Snapshot>>(
    new Map([[initialSnapshot.level, normalizeSnapshot(initialSnapshot)]]),
  );
  const [srsFilter, setSrsFilter] = useState<SrsFilter>(initialClientState.srsFilter);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialClientState.typeFilter);
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>(initialClientState.jlptFilter);
  const [reviewTimingFilter, setReviewTimingFilter] = useState<ReviewTimingFilter>(initialClientState.reviewTimingFilter);
  const [recentOnly, setRecentOnly] = useState(initialClientState.recentOnly);
  const [showLocked, setShowLocked] = useState(initialClientState.showLocked);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialClientState.selectedSubjectId);
  const [visibleTypes, setVisibleTypes] = useState(initialClientState.visibleTypes);
  const [stickyMerge, setStickyMerge] = useState(initialClientState.stickyMerge);
  const [filtersCollapsed, setFiltersCollapsed] = useState(initialClientState.filtersCollapsed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchMatchedSubjectIds, setSearchMatchedSubjectIds] = useState<Set<number> | null>(null);
  const [searchAvailableLevels, setSearchAvailableLevels] = useState<Set<number> | null>(null);
  const [gridColumns, setGridColumns] = useState(1);
  const [pendingHistoryMode, setPendingHistoryMode] = useState<"replace" | "push">("replace");

  return {
    selectedLevels,
    setSelectedLevels,
    snapshotsByLevel,
    setSnapshotsByLevel,
    srsFilter,
    setSrsFilter,
    typeFilter,
    setTypeFilter,
    jlptFilter,
    setJlptFilter,
    reviewTimingFilter,
    setReviewTimingFilter,
    recentOnly,
    setRecentOnly,
    showLocked,
    setShowLocked,
    selectedSubjectId,
    setSelectedSubjectId,
    visibleTypes,
    setVisibleTypes,
    stickyMerge,
    setStickyMerge,
    filtersCollapsed,
    setFiltersCollapsed,
    loading,
    setLoading,
    error,
    setError,
    searchMatchedSubjectIds,
    setSearchMatchedSubjectIds,
    searchAvailableLevels,
    setSearchAvailableLevels,
    gridColumns,
    setGridColumns,
    pendingHistoryMode,
    setPendingHistoryMode,
  };
}
