import { useCallback, useEffect, useMemo, useState } from "react";

import { selectionRange } from "@/app/shared/subjectSelection";

import {
  shortSubjectTypeLabel,
} from "../../level-explorer/lib/levelExplorerDisplay";
import type { StudyQueueItem } from "./studyExplorerTypes";

const BULK_MODE_KEY = "wr:study-bulk-mode";

type Args = {
  filteredItems: StudyQueueItem[];
};

export function useStudyBulkReset({ filteredItems }: Args) {
  const [bulkModeEnabled, setBulkModeEnabled] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(BULK_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<number>>(new Set());
  /*
   * The subject a range is measured from, not its position in the list. An
   * index stops meaning anything the moment a filter changes or another page
   * loads, and the next shift-click then sweeps a stretch the member never
   * crossed. The same fault was in the WaniKani explorer's copy of this.
   */
  const [bulkAnchorId, setBulkAnchorId] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedSubjectIds((prev) => {
        if (prev.size === 0) {
          return prev;
        }

        const available = new Set(filteredItems.map((item) => item.subjectId));
        const next = new Set<number>();
        for (const subjectId of prev.values()) {
          if (available.has(subjectId)) {
            next.add(subjectId);
          }
        }

        return next.size === prev.size ? prev : next;
      });
    });
  }, [filteredItems]);

  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedSubjectIds.has(item.subjectId)),
    [filteredItems, selectedSubjectIds],
  );

  const selectedDetails = useMemo(
    () =>
      selectedItems.map(
        (item) =>
          `${item.characters} • ${shortSubjectTypeLabel(item.subjectType)} • ${typeof item.wkLevel === "number" ? `L${item.wkLevel}` : "L?"} • SRS ${item.srsStage}`,
      ),
    [selectedItems],
  );

  const selectedPreview = useMemo(() => {
    return selectedItems.map((item) => item.characters);
  }, [selectedItems]);

  const toggleBulkSelection = (subjectId: number) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const applyBulkSelection = ({
    subjectId,
    shiftKey,
  }: {
    subjectId: number;
    /** Kept for callers; the anchor is the subject now, not its position. */
    sourceIndex?: number;
    shiftKey: boolean;
  }) => {
    if (!bulkModeEnabled) {
      return false;
    }

    if (shiftKey) {
      const rangeSubjectIds = selectionRange(
        bulkAnchorId,
        subjectId,
        filteredItems.map((item) => item.subjectId),
      );
      if (rangeSubjectIds.length > 0) {
        setSelectedSubjectIds((prev) => {
          const next = new Set(prev);
          for (const selectedSubjectId of rangeSubjectIds) {
            next.add(selectedSubjectId);
          }
          return next;
        });
        /* The far end anchors the next sweep, so a range can be walked out. */
        setBulkAnchorId(subjectId);
        return true;
      }
      /* Nothing anchored here: the click means what an unmodified one means. */
    }

    toggleBulkSelection(subjectId);
    setBulkAnchorId(subjectId);
    return true;
  };

  const toggleBulkMode = useCallback(() => {
    setBulkModeEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedSubjectIds(new Set());
        setBulkAnchorId(null);
      }
      try { window.localStorage.setItem(BULK_MODE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return {
    bulkModeEnabled,
    selectedSubjectIds,
    selectedItems,
    selectedDetails,
    selectedPreview,
    toggleBulkSelection,
    applyBulkSelection,
    toggleBulkMode,
    setBulkModeEnabled,
    setSelectedSubjectIds,
  };
}
