import { useCallback, useEffect, useState } from "react";

import {
  parseStudyModeBehavior,
  STUDY_MODE_BEHAVIOR_QUERY_KEY,
  STUDY_MODE_BEHAVIOR_STORAGE_KEY,
} from "./explorerStudyMode";
import type { StudyModeBehavior } from "./study-explorer/lib/studyExplorerTypes";

type Args = {
  isHydrated: boolean;
  initialStudyMode: boolean | null;
  clientStateHydratedRef: React.MutableRefObject<boolean>;
};

type StudyModeState = {
  studyMode: boolean;
  setStudyMode: React.Dispatch<React.SetStateAction<boolean>>;
  studyModeBehavior: StudyModeBehavior;
  setStudyModeBehavior: React.Dispatch<React.SetStateAction<StudyModeBehavior>>;
  syncFromUrlAndStorage: (params: URLSearchParams) => void;
  writeToUrl: (params: URLSearchParams) => boolean;
};

export function useStudyModeState({
  isHydrated,
  initialStudyMode,
  clientStateHydratedRef,
}: Args): StudyModeState {
  const [studyMode, setStudyMode] = useState(() =>
    true,
  );
  const [studyModeBehavior, setStudyModeBehavior] = useState<StudyModeBehavior>(() =>
    "session",
  );

  const syncFromUrlAndStorage = useCallback((params: URLSearchParams) => {
    const urlStudyMode = params.get("studyMode");
    if (urlStudyMode === "on" || urlStudyMode === "1") {
      setStudyMode(true);
    } else if (urlStudyMode === "off" || urlStudyMode === "0") {
      setStudyMode(true);
      setStudyModeBehavior("session");
    } else if (typeof initialStudyMode !== "boolean") {
      const storedStudyMode = window.localStorage.getItem("wr:study-mode");
      if (storedStudyMode !== null) {
        setStudyMode(true);
      }
    }

    const urlStudyModeBehavior = parseStudyModeBehavior(params.get(STUDY_MODE_BEHAVIOR_QUERY_KEY));
    if (urlStudyModeBehavior) {
      setStudyModeBehavior(urlStudyModeBehavior);
      return;
    }

    const storedStudyModeBehavior = parseStudyModeBehavior(
      window.localStorage.getItem(STUDY_MODE_BEHAVIOR_STORAGE_KEY),
    );
    if (storedStudyModeBehavior) {
      setStudyModeBehavior(storedStudyModeBehavior);
    }
  }, [initialStudyMode]);

  const writeToUrl = useCallback((params: URLSearchParams): boolean => {
    let changed = false;

    const studyModeInUrl = params.get("studyMode");
    const nextStudyMode = "on";
    if (studyModeInUrl !== nextStudyMode) {
      params.set("studyMode", nextStudyMode);
      changed = true;
    }

    const studyModeBehaviorInUrl = params.get(STUDY_MODE_BEHAVIOR_QUERY_KEY);
    if (studyModeBehaviorInUrl !== studyModeBehavior) {
      params.set(STUDY_MODE_BEHAVIOR_QUERY_KEY, studyModeBehavior);
      changed = true;
    }

    return changed;
  }, [studyMode, studyModeBehavior]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }

    try {
      window.localStorage.setItem("wr:study-mode", studyMode ? "1" : "0");
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [isHydrated, clientStateHydratedRef, studyMode]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined" || !clientStateHydratedRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(STUDY_MODE_BEHAVIOR_STORAGE_KEY, studyModeBehavior);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [isHydrated, clientStateHydratedRef, studyModeBehavior]);

  return {
    studyMode,
    setStudyMode,
    studyModeBehavior,
    setStudyModeBehavior,
    syncFromUrlAndStorage,
    writeToUrl,
  };
}