import { useEffect } from "react";

import type { StudyQueueItem, StudyViewerMode } from "./studyExplorerTypes";
import { isStudyViewerMode } from "./studyExplorerDomain";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export function useStudyToggleEnglishHotkey(
  canToggleEnglish: boolean,
  onToggleShowEnglish: () => void,
) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key.toLowerCase() !== "e" || !canToggleEnglish) {
        return;
      }

      event.preventDefault();
      onToggleShowEnglish();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canToggleEnglish, onToggleShowEnglish]);
}

export function useStudyCloseOnExplorerPageChange(setSelectedId: SetState<number | null>) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onExplorerPageChange = () => {
      setSelectedId(null);
    };

    window.addEventListener("wr:explorer-page-change", onExplorerPageChange as EventListener);
    return () => {
      window.removeEventListener("wr:explorer-page-change", onExplorerPageChange as EventListener);
    };
  }, [setSelectedId]);
}

export function useStudyViewerModeSync(setForcedViewerMode: SetState<StudyViewerMode | null>) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromUrl = () => {
      const viewer = new URLSearchParams(window.location.search).get("viewer");
      setForcedViewerMode(isStudyViewerMode(viewer) ? viewer : null);
    };

    syncFromUrl();
    const onPopState = () => syncFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [setForcedViewerMode]);
}

type ModalSessionArgs = {
  selectedId: number | null;
  filteredItems: StudyQueueItem[];
  setModalSessionOrderByAssignmentId: SetState<number[] | null>;
  setModalSessionItemByAssignmentId: SetState<Record<number, StudyQueueItem>>;
};

export function useStudyModalSessionSync({
  selectedId,
  filteredItems,
  setModalSessionOrderByAssignmentId,
  setModalSessionItemByAssignmentId,
}: ModalSessionArgs) {
  useEffect(() => {
    if (selectedId === null) {
      queueMicrotask(() => {
        setModalSessionOrderByAssignmentId(null);
        setModalSessionItemByAssignmentId({});
      });
      return;
    }

    queueMicrotask(() => {
      setModalSessionOrderByAssignmentId((prev) => {
        if (prev && prev.length > 0) {
          return prev;
        }
        if (filteredItems.length === 0) {
          return prev;
        }
        return filteredItems.map((item) => item.assignmentId);
      });

      setModalSessionItemByAssignmentId((prev) => {
        if (filteredItems.length === 0) {
          return prev;
        }

        const next = { ...prev };
        for (const item of filteredItems) {
          next[item.assignmentId] = item;
        }
        return next;
      });
    });
  }, [filteredItems, selectedId, setModalSessionItemByAssignmentId, setModalSessionOrderByAssignmentId]);
}