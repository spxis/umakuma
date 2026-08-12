import { useCallback, useMemo, useState } from "react";

import type { LevelItem } from "../../explorerTypes";

const BULK_MODE_STORAGE_KEY = "wr:level-bulk-mode";

type UseLevelExplorerBulkSelectionArgs = {
  accountId: string;
  filteredItems: LevelItem[];
  visibleItems: LevelItem[];
  selectedSubjectIds: Set<number>;
  onToggleSubjectSelection: (subjectId: number) => void;
  onSelectSubjectIds: (subjectIds: number[]) => void;
  onClearSelection: () => void;
};

// Owns bulk-select mode, the shift-click range anchor, and per-item study tag
// (favorite/trouble) optimistic overrides shared across the items grid and detail section.
export function useLevelExplorerBulkSelection({
  accountId,
  filteredItems,
  visibleItems,
  selectedSubjectIds,
  onToggleSubjectSelection,
  onSelectSubjectIds,
  onClearSelection,
}: UseLevelExplorerBulkSelectionArgs) {
  const [bulkModeEnabled, setBulkModeEnabled] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(BULK_MODE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [bulkAnchorIndex, setBulkAnchorIndex] = useState<number | null>(null);
  const [showAllSelectedInBar, setShowAllSelectedInBar] = useState(false);
  const [tagOverrides, setTagOverrides] = useState<Record<number, { favorite: boolean; trouble: boolean }>>({});

  const resolveStudyTags = useCallback(
    (item: LevelItem) => tagOverrides[item.subjectId] ?? item.studyTags ?? { favorite: false, trouble: false },
    [tagOverrides],
  );

  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedSubjectIds.has(item.subjectId)),
    [filteredItems, selectedSubjectIds],
  );

  const selectedPreview = useMemo(() => selectedItems.map((item) => item.characters), [selectedItems]);

  const onToggleStudyTag = useCallback(
    async (subjectId: number, tag: "favorite" | "trouble", enabled: boolean) => {
      const fallbackFromItems = filteredItems.find((entry) => entry.subjectId === subjectId)?.studyTags;
      const fallback = fallbackFromItems ?? { favorite: false, trouble: false };
      const current = tagOverrides[subjectId] ?? fallback;
      const next = { ...current, [tag]: enabled };

      setTagOverrides((prev) => ({ ...prev, [subjectId]: next }));

      try {
        const response = await fetch(`/api/study/${accountId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectId, tag, enabled }),
        });

        if (!response.ok) {
          throw new Error("Tag update failed.");
        }

        window.dispatchEvent(
          new CustomEvent("wr:study-tags-updated", {
            detail: { accountId, subjectId },
          }),
        );
      } catch {
        setTagOverrides((prev) => ({ ...prev, [subjectId]: current }));
      }
    },
    [accountId, filteredItems, tagOverrides],
  );

  const applyBulkSelection = useCallback(
    ({ subjectId, shiftKey, sourceIndex }: { subjectId: number; shiftKey: boolean; sourceIndex: number }) => {
      if (!bulkModeEnabled) {
        return false;
      }

      if (shiftKey && bulkAnchorIndex !== null) {
        const start = Math.min(bulkAnchorIndex, sourceIndex);
        const end = Math.max(bulkAnchorIndex, sourceIndex);
        const rangeIds = visibleItems.slice(start, end + 1).map((item) => item.subjectId);
        if (rangeIds.length > 0) {
          onSelectSubjectIds(rangeIds);
        }
        return true;
      }

      onToggleSubjectSelection(subjectId);
      setBulkAnchorIndex(sourceIndex);
      return true;
    },
    [bulkAnchorIndex, bulkModeEnabled, onSelectSubjectIds, onToggleSubjectSelection, visibleItems],
  );

  const toggleBulkMode = useCallback(() => {
    setBulkModeEnabled((previous) => {
      const next = !previous;
      if (!next) {
        onClearSelection();
        setBulkAnchorIndex(null);
        setShowAllSelectedInBar(false);
      }
      try {
        window.localStorage.setItem(BULK_MODE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage errors in restricted browsing modes.
      }
      return next;
    });
  }, [onClearSelection]);

  const exitBulkMode = useCallback(() => {
    setBulkModeEnabled(false);
    onClearSelection();
    setBulkAnchorIndex(null);
    setShowAllSelectedInBar(false);
    try {
      window.localStorage.setItem(BULK_MODE_STORAGE_KEY, "0");
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
  }, [onClearSelection]);

  return {
    bulkModeEnabled,
    showAllSelectedInBar,
    setShowAllSelectedInBar,
    selectedItems,
    selectedPreview,
    resolveStudyTags,
    onToggleStudyTag,
    applyBulkSelection,
    toggleBulkMode,
    exitBulkMode,
  };
}
