import { useEffect, useRef } from "react";
import { readExplorerSearch } from "@/lib/explorerSearchParam";

import type {
  StudyCounts,
  StudySrsFilter,
  StudySrsStageFilter,
  StudyTypeFilter,
} from "./studyExplorerTypes";
import {
  isAllStudySrsFilter,
  isAllStudyTypeFilter,
  isStudySrsFilterValue,
  isStudyTypeFilterValue,
  STUDY_SRS_FILTERS,
} from "./studyExplorerDomain";

type Args = {
  countsStorageKey: string;
  typeFilterStorageKey: string;
  viewedLevelStorageKey: string;
  recentOnlyStorageKey: string;
  showLockedStorageKey: string;
  srsStageFilterStorageKey: string;
  selectedSubjectStorageKey: string;
  setPersistedCounts: React.Dispatch<React.SetStateAction<StudyCounts | null>>;
  setTypeFilter: React.Dispatch<React.SetStateAction<StudyTypeFilter>>;
  setHasHydratedTypeFilter: React.Dispatch<React.SetStateAction<boolean>>;
  setViewedLevel: React.Dispatch<React.SetStateAction<number | null>>;
  setHasHydratedViewedLevel: React.Dispatch<React.SetStateAction<boolean>>;
  setRecentOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setSrsFilter: React.Dispatch<React.SetStateAction<StudySrsFilter>>;
  setSrsStageFilter: React.Dispatch<React.SetStateAction<StudySrsStageFilter | null>>;
  hasHydratedTypeFilter: boolean;
  hasHydratedViewedLevel: boolean;
  typeFilter: StudyTypeFilter;
  viewedLevel: number | null;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
  setSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  lastHandledStudyQueryRef: React.MutableRefObject<string>;
};

export function useStudyExplorerHydrationEffects({
  countsStorageKey,
  typeFilterStorageKey,
  viewedLevelStorageKey,
  recentOnlyStorageKey,
  showLockedStorageKey,
  srsStageFilterStorageKey,
  selectedSubjectStorageKey,
  setPersistedCounts,
  setTypeFilter,
  setHasHydratedTypeFilter,
  setViewedLevel,
  setHasHydratedViewedLevel,
  setRecentOnly,
  setShowLocked,
  setSrsFilter,
  setSrsStageFilter,
  hasHydratedTypeFilter,
  hasHydratedViewedLevel,
  typeFilter,
  viewedLevel,
  srsFilter,
  srsStageFilter,
  recentOnly,
  showLocked,
  setSelectedId,
  setSearchQuery,
  lastHandledStudyQueryRef,
}: Args) {
  const hasHydratedSrsStageFilterRef = useRef(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(countsStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<StudyCounts>;
      if (typeof parsed.all === "number" && typeof parsed.reviews === "number" && typeof parsed.lessons === "number") {
        setPersistedCounts({ all: parsed.all, reviews: parsed.reviews, lessons: parsed.lessons });
      }
    } catch {
      window.localStorage.removeItem(countsStorageKey);
    }
  }, [countsStorageKey, setPersistedCounts]);

  useEffect(() => {
    const urlType = new URLSearchParams(window.location.search).get("type");
    if (isStudyTypeFilterValue(urlType) && !isAllStudyTypeFilter(urlType)) {
      setTypeFilter(urlType);
      setHasHydratedTypeFilter(true);
      return;
    }

    const raw = window.localStorage.getItem(typeFilterStorageKey);
    if (!raw) {
      setHasHydratedTypeFilter(true);
      return;
    }

    if (isStudyTypeFilterValue(raw)) {
      setTypeFilter(raw);
      setHasHydratedTypeFilter(true);
      return;
    }

    window.localStorage.removeItem(typeFilterStorageKey);
    setHasHydratedTypeFilter(true);
  }, [setHasHydratedTypeFilter, setTypeFilter, typeFilterStorageKey]);

  useEffect(() => {
    const urlLevel = new URLSearchParams(window.location.search).get("level");
    if (urlLevel !== null) {
      const parsed = Number(urlLevel);
      if (Number.isInteger(parsed) && parsed > 0) {
        setViewedLevel(parsed);
        setHasHydratedViewedLevel(true);
        return;
      }
    }

    const raw = window.localStorage.getItem(viewedLevelStorageKey);
    if (!raw) {
      setViewedLevel(null);
      setHasHydratedViewedLevel(true);
      return;
    }

    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      setViewedLevel(parsed);
      setHasHydratedViewedLevel(true);
      return;
    }

    window.localStorage.removeItem(viewedLevelStorageKey);
    setViewedLevel(null);
    setHasHydratedViewedLevel(true);
  }, [setHasHydratedViewedLevel, setViewedLevel, viewedLevelStorageKey]);

  useEffect(() => {
    const urlRecent = new URLSearchParams(window.location.search).get("recent");
    if (urlRecent !== null) {
      setRecentOnly(urlRecent === "1");
      return;
    }

    const raw = window.localStorage.getItem(recentOnlyStorageKey);
    if (!raw) {
      setRecentOnly(false);
      return;
    }

    setRecentOnly(raw === "1");
  }, [recentOnlyStorageKey, setRecentOnly]);

  useEffect(() => {
    const syncShowLocked = () => {
      const urlHideLocked = new URLSearchParams(window.location.search).get("hideLocked");
      if (urlHideLocked !== null) {
        setShowLocked(urlHideLocked !== "1");
        return;
      }
      const raw = window.localStorage.getItem(showLockedStorageKey);
      if (raw) {
        setShowLocked(raw === "1");
      }
    };

    syncShowLocked();
    window.addEventListener("popstate", syncShowLocked);
    return () => window.removeEventListener("popstate", syncShowLocked);
  }, [setShowLocked, showLockedStorageKey]);

  useEffect(() => {
    const urlSrs = new URLSearchParams(window.location.search).get("srs");
    if (isStudySrsFilterValue(urlSrs) && !isAllStudySrsFilter(urlSrs)) {
      setSrsFilter(urlSrs);
      return;
    }

    setSrsFilter(STUDY_SRS_FILTERS.all);
  }, [setSrsFilter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = Number(params.get("srsStage"));
    if (Number.isInteger(fromUrl) && fromUrl >= 1 && fromUrl <= 9) {
      hasHydratedSrsStageFilterRef.current = true;
      setSrsStageFilter(fromUrl as StudySrsStageFilter);
      return;
    }

    const stored = Number(window.localStorage.getItem(srsStageFilterStorageKey));
    if (Number.isInteger(stored) && stored >= 1 && stored <= 9) {
      hasHydratedSrsStageFilterRef.current = true;
      setSrsStageFilter(stored as StudySrsStageFilter);
      return;
    }

    hasHydratedSrsStageFilterRef.current = true;
    setSrsStageFilter(null);
  }, [setSrsStageFilter, srsStageFilterStorageKey]);

  useEffect(() => {
    if (!hasHydratedTypeFilter || !hasHydratedViewedLevel || !hasHydratedSrsStageFilterRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (viewedLevel !== null) params.set("level", String(viewedLevel));
    else params.delete("level");
    if (!isAllStudyTypeFilter(typeFilter)) params.set("type", typeFilter);
    else params.delete("type");
    if (!isAllStudySrsFilter(srsFilter)) params.set("srs", srsFilter);
    else params.delete("srs");
    if (!isAllStudySrsFilter(srsFilter) && srsStageFilter !== null) params.set("srsStage", String(srsStageFilter));
    else params.delete("srsStage");
    if (recentOnly) params.set("recent", "1");
    else params.delete("recent");
    if (!showLocked) params.set("hideLocked", "1");
    else params.delete("hideLocked");

    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [hasHydratedTypeFilter, hasHydratedViewedLevel, recentOnly, showLocked, srsFilter, srsStageFilter, typeFilter, viewedLevel]);

  useEffect(() => {
    if (!hasHydratedTypeFilter) return;
    window.localStorage.setItem(typeFilterStorageKey, typeFilter);
  }, [hasHydratedTypeFilter, typeFilter, typeFilterStorageKey]);

  useEffect(() => {
    if (!hasHydratedViewedLevel) return;
    if (viewedLevel === null) {
      window.localStorage.removeItem(viewedLevelStorageKey);
      return;
    }

    window.localStorage.setItem(viewedLevelStorageKey, String(viewedLevel));
  }, [hasHydratedViewedLevel, viewedLevel, viewedLevelStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(recentOnlyStorageKey, recentOnly ? "1" : "0");
  }, [recentOnly, recentOnlyStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(showLockedStorageKey, showLocked ? "1" : "0");
  }, [showLocked, showLockedStorageKey]);

  useEffect(() => {
    if (srsStageFilter === null) {
      window.localStorage.removeItem(srsStageFilterStorageKey);
      return;
    }

    window.localStorage.setItem(srsStageFilterStorageKey, String(srsStageFilter));
  }, [srsStageFilter, srsStageFilterStorageKey]);

  useEffect(() => {
    try {
      const fromUrl = Number(new URLSearchParams(window.location.search).get("subject"));
      if (Number.isInteger(fromUrl) && fromUrl > 0) {
        setSelectedId(fromUrl);
        return;
      }

      const raw = window.localStorage.getItem(selectedSubjectStorageKey);
      const parsed = Number(raw);
      setSelectedId(Number.isInteger(parsed) && parsed > 0 ? parsed : null);
    } catch {
      setSelectedId(null);
    }
  }, [selectedSubjectStorageKey, setSelectedId]);

  useEffect(() => {
    const runFromUrl = () => {
      const fromUrl = readExplorerSearch(new URLSearchParams(window.location.search));
      if (fromUrl === lastHandledStudyQueryRef.current) return;
      lastHandledStudyQueryRef.current = fromUrl;
      setSearchQuery(fromUrl);
    };

    runFromUrl();
    const onPopState = () => runFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [lastHandledStudyQueryRef, setSearchQuery]);
}
