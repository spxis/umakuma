import { useEffect } from "react";
import type { LevelItem } from "../../explorerTypes";

type UseLevelExplorerKeyboardNavArgs = {
  selectedItem: LevelItem | null;
  filteredItems: LevelItem[];
  gridColumns: number;
  canToggleEnglish: boolean;
  onToggleShowEnglish: () => void;
  onMarkHistoryPush: () => void;
  onSetSelectedSubjectId: (next: number | null | ((prev: number | null) => number | null)) => void;
  setPeekSubjectId: (next: number | null) => void;
};

// Handles arrow/wasd navigation between explorer cards, space/escape to deselect,
// and "e" to toggle English, while ignoring keystrokes typed into form fields.
export function useLevelExplorerKeyboardNav({
  selectedItem,
  filteredItems,
  gridColumns,
  canToggleEnglish,
  onToggleShowEnglish,
  onMarkHistoryPush,
  onSetSelectedSubjectId,
  setPeekSubjectId,
}: UseLevelExplorerKeyboardNavArgs) {
  useEffect(() => {
    if (!selectedItem) {
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
      const key = event.key.toLowerCase();
      if (key === "e" && canToggleEnglish) {
        event.preventDefault();
        onToggleShowEnglish();
        return;
      }
      if (key === " " || event.code === "Space") {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onMarkHistoryPush();
        onSetSelectedSubjectId(null);
        setPeekSubjectId(null);
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onMarkHistoryPush();
        onSetSelectedSubjectId(null);
        setPeekSubjectId(null);
        return;
      }
      const columns = Math.max(1, gridColumns);
      const delta =
        key === "l" || key === "a" || event.key === "ArrowLeft"
          ? -1
          : key === "r" || key === "d" || event.key === "ArrowRight"
            ? 1
            : key === "w" || event.key === "ArrowUp"
              ? -columns
              : key === "s" || event.key === "ArrowDown"
                ? columns
                : null;
      if (delta === null) {
        return;
      }
      const currentIndex = filteredItems.findIndex((item) => item.subjectId === selectedItem.subjectId);
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= filteredItems.length) {
        return;
      }
      if (nextIndex === currentIndex) {
        return;
      }
      const nextItem = filteredItems[nextIndex];
      if (!nextItem) {
        return;
      }
      const currentRow = Math.floor(currentIndex / columns);
      const nextRow = Math.floor(nextIndex / columns);
      const movedToDifferentRow = currentRow !== nextRow;
      event.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onMarkHistoryPush();
      onSetSelectedSubjectId(nextItem.subjectId);
      setPeekSubjectId(null);
      if (movedToDifferentRow) {
        window.requestAnimationFrame(() => {
          const nextCard = document.querySelector<HTMLElement>(
            `[data-explorer-card-subject-id="${nextItem.subjectId}"]`,
          );
          if (!nextCard) {
            return;
          }
          const topOffset = 112;
          const targetTop = window.scrollY + nextCard.getBoundingClientRect().top - topOffset;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    canToggleEnglish,
    filteredItems,
    gridColumns,
    onMarkHistoryPush,
    onSetSelectedSubjectId,
    onToggleShowEnglish,
    selectedItem,
    setPeekSubjectId,
  ]);
}
