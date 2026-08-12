import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { LevelItem, Snapshot, SrsFilter } from "../../explorerTypes";
import {
  useLevelExplorerStorageHydration,
  useLevelExplorerUrlHydration,
} from "./levelExplorerHydrationEffects";
import {
  useLevelExplorerGridColumns,
  useLevelExplorerSearchEvents,
  useLevelExplorerSelectionReconcile,
  useLevelExplorerStoragePersistence,
} from "./levelExplorerPersistenceEffects";
import { snapshotHasComponentKanjiData, snapshotHasJlptMetaData } from "./levelExplorerSnapshotUtils";
import type { JlptFilter, ReviewTimingFilter, TypeFilter, TypeVisibility } from "./levelExplorerState";

type StorageKeys = Parameters<typeof useLevelExplorerStorageHydration>[0]["storageKeys"];

type UseLevelExplorerControllerEffectsArgs = {
  isActive: boolean;
  maxLevel: number;
  initialSnapshot: Snapshot;
  forceShowLocked: boolean;
  customLibraryId: string | null;
  storageKeys: StorageKeys;
  applyingUrlStateRef: MutableRefObject<boolean>;
  hasHydratedUrlStateRef: MutableRefObject<boolean>;
  lastHandledFindQueryRef: MutableRefObject<string>;
  ensureLevelLoadedRef: MutableRefObject<(level: number, forceReload?: boolean) => Promise<Snapshot | undefined>>;
  ensureLevelLoaded: (level: number, forceReload?: boolean) => Promise<Snapshot | undefined>;
  writeUrlState: () => void;
  searchAndReveal: (query: string, requestId?: string) => Promise<void>;
  snapshotsByLevel: Map<number, Snapshot>;
  selectedLevels: Set<number>;
  selectedSubjectId: number | null;
  selectedItem: LevelItem | null;
  selectedItemFromAll: LevelItem | null;
  srsFilter: SrsFilter;
  typeFilter: TypeFilter;
  jlptFilter: JlptFilter;
  reviewTimingFilter: ReviewTimingFilter;
  recentOnly: boolean;
  showLocked: boolean;
  stickyMerge: boolean;
  visibleTypes: TypeVisibility;
  pendingHistoryMode: "replace" | "push";
  setSelectedLevels: Dispatch<SetStateAction<Set<number>>>;
  setSelectedSubjectId: Dispatch<SetStateAction<number | null>>;
  setSrsFilter: Dispatch<SetStateAction<SrsFilter>>;
  setTypeFilter: Dispatch<SetStateAction<TypeFilter>>;
  setJlptFilter: Dispatch<SetStateAction<JlptFilter>>;
  setReviewTimingFilter: Dispatch<SetStateAction<ReviewTimingFilter>>;
  setRecentOnly: Dispatch<SetStateAction<boolean>>;
  setShowLocked: Dispatch<SetStateAction<boolean>>;
  setStickyMerge: Dispatch<SetStateAction<boolean>>;
  setFiltersCollapsed: Dispatch<SetStateAction<boolean>>;
  setVisibleTypes: Dispatch<SetStateAction<TypeVisibility>>;
  setVisibleTypesAndPersist: (next: TypeVisibility) => void;
  setGridColumns: Dispatch<SetStateAction<number>>;
  setSearchMatchedSubjectIds: Dispatch<SetStateAction<Set<number> | null>>;
  setSearchAvailableLevels: Dispatch<SetStateAction<Set<number> | null>>;
};

// Wires up every controller-level effect: URL/localStorage hydration, URL persistence,
// grid column tracking, storage persistence, level metadata backfill, selection
// reconciliation, and search event handling. Kept as one hook so the controller
// component only has to make a single call for all of this side-effect orchestration.
export function useLevelExplorerControllerEffects({
  isActive,
  maxLevel,
  initialSnapshot,
  forceShowLocked,
  customLibraryId,
  storageKeys,
  applyingUrlStateRef,
  hasHydratedUrlStateRef,
  lastHandledFindQueryRef,
  ensureLevelLoadedRef,
  ensureLevelLoaded,
  writeUrlState,
  searchAndReveal,
  snapshotsByLevel,
  selectedLevels,
  selectedSubjectId,
  selectedItem,
  selectedItemFromAll,
  srsFilter,
  typeFilter,
  jlptFilter,
  reviewTimingFilter,
  recentOnly,
  showLocked,
  stickyMerge,
  visibleTypes,
  pendingHistoryMode,
  setSelectedLevels,
  setSelectedSubjectId,
  setSrsFilter,
  setTypeFilter,
  setJlptFilter,
  setReviewTimingFilter,
  setRecentOnly,
  setShowLocked,
  setStickyMerge,
  setFiltersCollapsed,
  setVisibleTypes,
  setVisibleTypesAndPersist,
  setGridColumns,
  setSearchMatchedSubjectIds,
  setSearchAvailableLevels,
}: UseLevelExplorerControllerEffectsArgs) {
  useEffect(() => {
    ensureLevelLoadedRef.current = ensureLevelLoaded;
  }, [ensureLevelLoaded, ensureLevelLoadedRef]);

  useLevelExplorerUrlHydration({
    maxLevel,
    initialLevel: initialSnapshot.level,
    ensureLevelLoaded: (level) => ensureLevelLoaded(level),
    applyingUrlStateRef,
    hasHydratedUrlStateRef,
    setSelectedLevels,
    setSelectedSubjectId,
    setSrsFilter,
    setTypeFilter,
    setJlptFilter,
    setReviewTimingFilter,
    setRecentOnly,
    setStickyMerge,
    skipInitialApply: forceShowLocked,
  });

  useLevelExplorerStorageHydration({
    storageKeys,
    setVisibleTypes,
    setSelectedSubjectId,
    setStickyMerge,
    setFiltersCollapsed,
    setSrsFilter,
    setTypeFilter,
    setJlptFilter,
    setReviewTimingFilter,
    setRecentOnly,
    setShowLocked,
  });

  useEffect(() => {
    if (!forceShowLocked || !customLibraryId) {
      return;
    }

    const allLevels = new Set(Array.from({ length: Math.max(1, maxLevel) }, (_, index) => index + 1));

    void (async () => {
      for (const level of allLevels.values()) {
        await ensureLevelLoadedRef.current(level, true);
      }
    })();
  }, [customLibraryId, ensureLevelLoadedRef, forceShowLocked, maxLevel]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (!hasHydratedUrlStateRef.current) {
      return;
    }

    // Allow explicit user actions (push mode) to update URL even if hydration is still settling.
    if (applyingUrlStateRef.current && pendingHistoryMode !== "push") {
      return;
    }

    writeUrlState();
  }, [
    applyingUrlStateRef,
    hasHydratedUrlStateRef,
    isActive,
    jlptFilter,
    pendingHistoryMode,
    reviewTimingFilter,
    selectedLevels,
    selectedSubjectId,
    srsFilter,
    stickyMerge,
    typeFilter,
    writeUrlState,
  ]);

  useLevelExplorerGridColumns(setGridColumns);

  useLevelExplorerStoragePersistence({
    storageKeys,
    srsFilter,
    typeFilter,
    jlptFilter,
    reviewTimingFilter,
    recentOnly,
    showLocked,
    selectedSubjectId,
  });

  useEffect(() => {
    const current = snapshotsByLevel.get(initialSnapshot.level);
    if (current && (!snapshotHasComponentKanjiData(current) || !snapshotHasJlptMetaData(current))) {
      void ensureLevelLoaded(initialSnapshot.level, true);
    }
  }, [ensureLevelLoaded, initialSnapshot.level, snapshotsByLevel]);

  useLevelExplorerSelectionReconcile({
    selectedItem,
    selectedItemFromAll,
    typeFilter,
    visibleTypes,
    srsFilter,
    jlptFilter,
    reviewTimingFilter,
    hasHydratedUrlStateRef,
    setTypeFilter,
    setVisibleTypesAndPersist,
    setSrsFilter,
    setJlptFilter,
    setReviewTimingFilter,
  });

  useLevelExplorerSearchEvents({
    searchAndReveal,
    setSearchMatchedSubjectIds,
    setSearchAvailableLevels,
    lastHandledFindQueryRef,
  });
}
