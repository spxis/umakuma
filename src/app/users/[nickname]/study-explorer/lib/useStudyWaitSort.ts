import { useCallback, useEffect, useState } from "react";

import type { StudyQueueItem, StudyWaitSortOrder } from "./studyExplorerTypes";
import { isStudyWaitSortOrder } from "./studyExplorerView";
import { shuffleStudyAssignmentIds } from "./studyExplorerUtils";

type UseStudyWaitSortArgs = {
  filteredItems: StudyQueueItem[];
  waitSortStorageKey: string;
  waitRandomOrderStorageKey: string;
};

type UseStudyWaitSortResult = {
  hasHydratedWaitSort: boolean;
  waitSortOrder: StudyWaitSortOrder;
  waitRandomOrderByAssignmentId: number[] | null;
  setWaitSortOrder: (sortOrder: StudyWaitSortOrder) => void;
};

function readStoredRandomOrder(key: string): number[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const ids = parsed.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function useStudyWaitSort({
  filteredItems,
  waitSortStorageKey,
  waitRandomOrderStorageKey,
}: UseStudyWaitSortArgs): UseStudyWaitSortResult {
  const [waitSortOrder, setWaitSortOrderState] = useState<StudyWaitSortOrder>("oldest_wait");
  const [waitRandomOrderByAssignmentId, setWaitRandomOrderByAssignmentId] = useState<number[] | null>(null);
  const [hasHydratedWaitSort, setHasHydratedWaitSort] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const fromUrl = new URLSearchParams(window.location.search).get("waitSort");
    if (isStudyWaitSortOrder(fromUrl)) {
      queueMicrotask(() => setWaitSortOrderState(fromUrl));
    } else {
      const stored = window.localStorage.getItem(waitSortStorageKey);
      if (isStudyWaitSortOrder(stored)) {
        queueMicrotask(() => setWaitSortOrderState(stored));
      }
    }

    queueMicrotask(() => setWaitRandomOrderByAssignmentId(readStoredRandomOrder(waitRandomOrderStorageKey)));
    queueMicrotask(() => setHasHydratedWaitSort(true));
  }, [waitRandomOrderStorageKey, waitSortStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(waitSortStorageKey, waitSortOrder);
    const params = new URLSearchParams(window.location.search);
    params.set("waitSort", waitSortOrder);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  }, [waitSortOrder, waitSortStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!waitRandomOrderByAssignmentId || waitRandomOrderByAssignmentId.length === 0) {
      window.localStorage.removeItem(waitRandomOrderStorageKey);
      return;
    }

    window.localStorage.setItem(waitRandomOrderStorageKey, JSON.stringify(waitRandomOrderByAssignmentId));
  }, [waitRandomOrderByAssignmentId, waitRandomOrderStorageKey]);

  const setWaitSortOrder = useCallback(
    (sortOrder: StudyWaitSortOrder) => {
      if (sortOrder === "random_wait") {
        setWaitRandomOrderByAssignmentId(shuffleStudyAssignmentIds(filteredItems));
      }
      setWaitSortOrderState(sortOrder);
    },
    [filteredItems],
  );

  return { hasHydratedWaitSort, waitSortOrder, waitRandomOrderByAssignmentId, setWaitSortOrder };
}
