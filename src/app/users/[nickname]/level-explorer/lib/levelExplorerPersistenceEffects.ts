import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { LevelItem, SrsFilter } from "../../explorerTypes";
import {
  LEVEL_JLPT_FILTERS,
  LEVEL_REVIEW_TIMING_FILTERS,
  LEVEL_SRS_FILTERS,
  LEVEL_TYPE_FILTERS,
  persistEnum,
  persistFlag,
  persistOptionalPositiveInteger,
  type JlptFilter,
  type ReviewTimingFilter,
  type TypeFilter,
} from "./levelExplorerState";
import { passesReviewTimingFilter } from "./levelExplorerSelectors";
import { EXPLORER_SEARCH_SCOPES, type ExplorerSearchScope } from "../../explorerSearchDomain";

export function useLevelExplorerGridColumns(setGridColumns: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    const computeColumns = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setGridColumns(4);
        return;
      }

      if (window.matchMedia("(min-width: 640px)").matches) {
        setGridColumns(2);
        return;
      }

      setGridColumns(1);
    };

    computeColumns();
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    sm.addEventListener("change", computeColumns);
    lg.addEventListener("change", computeColumns);

    return () => {
      sm.removeEventListener("change", computeColumns);
      lg.removeEventListener("change", computeColumns);
    };
  }, [setGridColumns]);
}

export function useLevelExplorerStoragePersistence({
  storageKeys,
  srsFilter,
  typeFilter,
  jlptFilter,
  reviewTimingFilter,
  recentOnly,
  showLocked,
  selectedSubjectId,
}: {
  storageKeys: {
    selectedSubject: string;
    recentOnly: string;
    showLocked: string;
    srsFilter: string;
    typeFilter: string;
    jlptFilter: string;
    reviewTimingFilter: string;
  };
  srsFilter: SrsFilter;
  typeFilter: TypeFilter;
  jlptFilter: JlptFilter;
  reviewTimingFilter: ReviewTimingFilter;
  recentOnly: boolean;
  showLocked: boolean;
  selectedSubjectId: number | null;
}) {
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    try {
      persistEnum(window.localStorage, storageKeys.srsFilter, srsFilter);
      persistEnum(window.localStorage, storageKeys.typeFilter, typeFilter);
      persistEnum(window.localStorage, storageKeys.jlptFilter, jlptFilter);
      persistEnum(window.localStorage, storageKeys.reviewTimingFilter, reviewTimingFilter);
      persistFlag(window.localStorage, storageKeys.recentOnly, recentOnly);
      persistFlag(window.localStorage, storageKeys.showLocked, showLocked);
      persistOptionalPositiveInteger(window.localStorage, storageKeys.selectedSubject, selectedSubjectId);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [srsFilter, typeFilter, jlptFilter, reviewTimingFilter, recentOnly, showLocked, selectedSubjectId, storageKeys]);
}

export function useLevelExplorerSelectionReconcile({
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
}: {
  selectedItem: LevelItem | null;
  selectedItemFromAll: LevelItem | null;
  typeFilter: TypeFilter;
  visibleTypes: { radical: boolean; kanji: boolean; vocabulary: boolean };
  srsFilter: SrsFilter;
  jlptFilter: JlptFilter;
  reviewTimingFilter: ReviewTimingFilter;
  hasHydratedUrlStateRef: MutableRefObject<boolean>;
  setTypeFilter: Dispatch<SetStateAction<TypeFilter>>;
  setVisibleTypesAndPersist: (next: { radical: boolean; kanji: boolean; vocabulary: boolean }) => void;
  setSrsFilter: Dispatch<SetStateAction<SrsFilter>>;
  setJlptFilter: Dispatch<SetStateAction<JlptFilter>>;
  setReviewTimingFilter: Dispatch<SetStateAction<ReviewTimingFilter>>;
}) {
  useEffect(() => {
    if (!hasHydratedUrlStateRef.current) {
      return;
    }

    if (!selectedItemFromAll || selectedItem) {
      return;
    }

    if (selectedItemFromAll.subjectType && !visibleTypes[selectedItemFromAll.subjectType]) {
      setVisibleTypesAndPersist({ ...visibleTypes, [selectedItemFromAll.subjectType]: true });
    }

    if (srsFilter !== LEVEL_SRS_FILTERS.all && selectedItemFromAll.status !== srsFilter) {
      setSrsFilter(LEVEL_SRS_FILTERS.all);
    }

    if (jlptFilter !== LEVEL_JLPT_FILTERS.all) {
      const matchesJlpt =
        jlptFilter === LEVEL_JLPT_FILTERS.none
          ? !selectedItemFromAll.jlptLevel
          : selectedItemFromAll.subjectType === LEVEL_TYPE_FILTERS.kanji &&
            selectedItemFromAll.jlptLevel === Number(jlptFilter.slice(1));
      if (!matchesJlpt) {
        setJlptFilter(LEVEL_JLPT_FILTERS.all);
      }
    }

    if (!passesReviewTimingFilter(selectedItemFromAll, reviewTimingFilter)) {
      setReviewTimingFilter(LEVEL_REVIEW_TIMING_FILTERS.all);
    }
  }, [
    hasHydratedUrlStateRef,
    jlptFilter,
    reviewTimingFilter,
    selectedItem,
    selectedItemFromAll,
    setJlptFilter,
    setReviewTimingFilter,
    setSrsFilter,
    setTypeFilter,
    setVisibleTypesAndPersist,
    srsFilter,
    typeFilter,
    visibleTypes,
  ]);
}

export function useLevelExplorerSearchEvents({
  searchAndReveal,
  setSearchMatchedSubjectIds,
  setSearchAvailableLevels,
  lastHandledFindQueryRef,
}: {
  searchAndReveal: (query: string, requestId?: string) => Promise<void>;
  setSearchMatchedSubjectIds: Dispatch<SetStateAction<Set<number> | null>>;
  setSearchAvailableLevels: Dispatch<SetStateAction<Set<number> | null>>;
  lastHandledFindQueryRef: MutableRefObject<string>;
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const runFromUrl = () => {
      const fromUrl = new URLSearchParams(window.location.search).get("findLevel");
      const trimmed = fromUrl?.trim() ?? "";
      if (!trimmed) {
        setSearchMatchedSubjectIds(null);
        setSearchAvailableLevels(null);
        return;
      }

      if (lastHandledFindQueryRef.current === trimmed) {
        return;
      }

      lastHandledFindQueryRef.current = trimmed;
      void searchAndReveal(trimmed);
    };

    runFromUrl();

    const onSearch = (event: Event) => {
      const custom = event as CustomEvent<{ query?: string; requestId?: string; scope?: ExplorerSearchScope }>;
      if (custom.detail?.scope === EXPLORER_SEARCH_SCOPES.jlpt) {
        return;
      }

      const query = custom.detail?.query ?? "";
      const requestId = custom.detail?.requestId;
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      lastHandledFindQueryRef.current = trimmed;
      void searchAndReveal(trimmed, requestId);
    };

    const onClear = (event: Event) => {
      const custom = event as CustomEvent<{ scope?: ExplorerSearchScope }>;
      const scope = custom.detail?.scope ?? LEVEL_TYPE_FILTERS.all;
      if (scope === LEVEL_TYPE_FILTERS.all || scope === EXPLORER_SEARCH_SCOPES.level) {
        setSearchMatchedSubjectIds(null);
        setSearchAvailableLevels(null);
      }
    };

    window.addEventListener("wr:explorer-search", onSearch as EventListener);
    window.addEventListener("popstate", runFromUrl);
    window.addEventListener("wr:explorer-search-clear", onClear as EventListener);
    return () => {
      window.removeEventListener("wr:explorer-search", onSearch as EventListener);
      window.removeEventListener("popstate", runFromUrl);
      window.removeEventListener("wr:explorer-search-clear", onClear as EventListener);
    };
  }, [searchAndReveal, setSearchMatchedSubjectIds, setSearchAvailableLevels, lastHandledFindQueryRef]);
}
