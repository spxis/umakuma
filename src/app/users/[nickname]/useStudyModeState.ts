import { useCallback, useEffect, useState } from "react";

import {
  parseStudyModeBehavior,
  resolveStudyMode,
  STUDY_MODE_BEHAVIOR_QUERY_KEY,
  STUDY_MODE_BEHAVIOR_STORAGE_KEY,
  STUDY_MODE_STORAGE_KEY,
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
  /*
   * The page resolved `?studyMode=` on the server, so honouring it here is the
   * same answer on both sides of hydration. On is the default only when
   * nothing has an opinion.
   */
  const [studyMode, setStudyMode] = useState(() => initialStudyMode ?? true);
  const [studyModeBehavior, setStudyModeBehavior] = useState<StudyModeBehavior>(() =>
    "session",
  );

  const syncFromUrlAndStorage = useCallback((params: URLSearchParams) => {
    setStudyMode((current) =>
      resolveStudyMode({
        urlValue: params.get("studyMode"),
        storedValue: window.localStorage.getItem(STUDY_MODE_STORAGE_KEY),
        initialStudyMode,
        current,
      }),
    );

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
    const nextStudyMode = studyMode ? "on" : "off";
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
      window.localStorage.setItem(STUDY_MODE_STORAGE_KEY, studyMode ? "1" : "0");
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