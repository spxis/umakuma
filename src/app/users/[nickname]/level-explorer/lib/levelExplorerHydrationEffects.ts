import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { Snapshot, SrsFilter } from "../../explorerTypes";
import {
  JLPT_FILTER_ALLOWED,
  LEVEL_TYPE_FILTERS,
  REVIEW_TIMING_ALLOWED,
  SRS_FILTER_ALLOWED,
  parseLevelExplorerUrlState,
  readStoredEnum,
  readStoredFlag,
  readStoredPositiveInteger,
  readStoredTypeVisibility,
  type JlptFilter,
  type ReviewTimingFilter,
  type TypeFilter,
} from "./levelExplorerState";

type BaseSetters = {
  setSelectedLevels: Dispatch<SetStateAction<Set<number>>>;
  setSelectedSubjectId: Dispatch<SetStateAction<number | null>>;
  setSrsFilter: Dispatch<SetStateAction<SrsFilter>>;
  setTypeFilter: Dispatch<SetStateAction<TypeFilter>>;
  setJlptFilter: Dispatch<SetStateAction<JlptFilter>>;
  setReviewTimingFilter: Dispatch<SetStateAction<ReviewTimingFilter>>;
  setRecentOnly: Dispatch<SetStateAction<boolean>>;
  setStickyMerge: Dispatch<SetStateAction<boolean>>;
};

function setsEqual(left: Set<number>, right: Set<number>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

export function useLevelExplorerUrlHydration({
  maxLevel,
  initialLevel,
  ensureLevelLoaded,
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
  skipInitialApply = false,
}: {
  maxLevel: number;
  initialLevel: number;
  ensureLevelLoaded: (level: number) => Promise<Snapshot | undefined>;
  applyingUrlStateRef: MutableRefObject<boolean>;
  hasHydratedUrlStateRef: MutableRefObject<boolean>;
  skipInitialApply?: boolean;
} & BaseSetters) {
  const ensureLevelLoadedRef = useRef(ensureLevelLoaded);

  useEffect(() => {
    ensureLevelLoadedRef.current = ensureLevelLoaded;
  }, [ensureLevelLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const applyFromUrl = async () => {
      applyingUrlStateRef.current = true;
      const parsed = parseLevelExplorerUrlState(window.location.search, maxLevel, initialLevel);
      const levelsArray = Array.from(parsed.levels.values()).sort((a, b) => a - b);
      const normalizedLevels = parsed.stickyMerge
        ? new Set(levelsArray)
        : new Set([levelsArray[levelsArray.length - 1] ?? initialLevel]);

      setSelectedLevels((prev) => (setsEqual(prev, normalizedLevels) ? prev : normalizedLevels));
      setSelectedSubjectId(parsed.subjectId);
      setSrsFilter(parsed.srs);
      setTypeFilter(parsed.type);
      setJlptFilter(parsed.jlpt);
      setReviewTimingFilter(parsed.review);
      setRecentOnly(parsed.recentOnly);
      setStickyMerge(parsed.stickyMerge);

      for (const level of normalizedLevels.values()) {
        await ensureLevelLoadedRef.current(level);
      }

      applyingUrlStateRef.current = false;
      hasHydratedUrlStateRef.current = true;
    };

    if (!skipInitialApply) {
      void applyFromUrl();
    }

    const onPopState = () => {
      void applyFromUrl();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [
    applyingUrlStateRef,
    hasHydratedUrlStateRef,
    initialLevel,
    maxLevel,
    setJlptFilter,
    setRecentOnly,
    setReviewTimingFilter,
    setSelectedLevels,
    setSelectedSubjectId,
    setSrsFilter,
    setStickyMerge,
    setTypeFilter,
    skipInitialApply,
  ]);
}

export function useLevelExplorerStorageHydration({
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
}: {
  storageKeys: {
    typeVisibility: string;
    selectedSubject: string;
    stickyMerge: string;
    filtersCollapsed: string;
    recentOnly: string;
    showLocked: string;
    srsFilter: string;
    typeFilter: string;
    jlptFilter: string;
    reviewTimingFilter: string;
  };
  setVisibleTypes: Dispatch<SetStateAction<{ radical: boolean; kanji: boolean; vocabulary: boolean }>>;
  setSelectedSubjectId: Dispatch<SetStateAction<number | null>>;
  setStickyMerge: Dispatch<SetStateAction<boolean>>;
  setFiltersCollapsed: Dispatch<SetStateAction<boolean>>;
  setSrsFilter: Dispatch<SetStateAction<SrsFilter>>;
  setTypeFilter: Dispatch<SetStateAction<TypeFilter>>;
  setJlptFilter: Dispatch<SetStateAction<JlptFilter>>;
  setReviewTimingFilter: Dispatch<SetStateAction<ReviewTimingFilter>>;
  setRecentOnly: Dispatch<SetStateAction<boolean>>;
  setShowLocked: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    try {
      setVisibleTypes((prev) => readStoredTypeVisibility(window.localStorage, storageKeys.typeVisibility, prev));

      if (!new URLSearchParams(window.location.search).has("subject")) {
        const selected = readStoredPositiveInteger(window.localStorage, storageKeys.selectedSubject);
        if (selected !== null) {
          setSelectedSubjectId(selected);
        }
      }

      if (!new URLSearchParams(window.location.search).has("sticky") && readStoredFlag(window.localStorage, storageKeys.stickyMerge)) {
        setStickyMerge(true);
      }

      if (readStoredFlag(window.localStorage, storageKeys.filtersCollapsed)) {
        setFiltersCollapsed(true);
      }

      if (!new URLSearchParams(window.location.search).has("recent") && readStoredFlag(window.localStorage, storageKeys.recentOnly)) {
        setRecentOnly(true);
      }

      if (readStoredFlag(window.localStorage, storageKeys.showLocked)) {
        setShowLocked(true);
      }

      if (!new URLSearchParams(window.location.search).has("srs")) {
        const srs = readStoredEnum(window.localStorage, storageKeys.srsFilter, SRS_FILTER_ALLOWED);
        if (srs) {
          setSrsFilter(srs);
        }
      }

      if (!new URLSearchParams(window.location.search).has("type")) {
        setTypeFilter(LEVEL_TYPE_FILTERS.all);
      }

      if (!new URLSearchParams(window.location.search).has("jlpt")) {
        const jlpt = readStoredEnum(window.localStorage, storageKeys.jlptFilter, JLPT_FILTER_ALLOWED);
        if (jlpt) {
          setJlptFilter(jlpt);
        }
      }

      if (!new URLSearchParams(window.location.search).has("review")) {
        const review = readStoredEnum(window.localStorage, storageKeys.reviewTimingFilter, REVIEW_TIMING_ALLOWED);
        if (review) {
          setReviewTimingFilter(review);
        }
      }
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [
    setFiltersCollapsed,
    setJlptFilter,
    setRecentOnly,
    setReviewTimingFilter,
    setSelectedSubjectId,
    setShowLocked,
    setSrsFilter,
    setStickyMerge,
    setTypeFilter,
    setVisibleTypes,
    storageKeys,
  ]);
}
