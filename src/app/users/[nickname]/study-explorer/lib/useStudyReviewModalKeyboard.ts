import { useEffect } from "react";

import type {
  ReviewOutcome,
  StudyQueueItem,
  StudyReviewSubmitResult,
  StudyViewerMode,
} from "./studyExplorerTypes";
import {
  isReviewQueueItem,
  STUDY_REVIEW_OUTCOMES,
  STUDY_VIEWER_MODES,
} from "./studyExplorerDomain";

type UseStudyReviewModalKeyboardArgs = {
  selectedItem: StudyQueueItem | null;
  studyMode: boolean;
  viewerMode: StudyViewerMode;
  flashRevealed: boolean;
  currentFlashKey: string;
  canUseFlashCycleNext: boolean;
  isAnswerRevealed: boolean;
  reviewOutcomeByAssignmentId: Record<number, ReviewOutcome>;
  onCloseModal: () => void;
  onGoPrev: () => void;
  onGoNextItem: () => void;
  onAdvanceFlashOrNext: () => void;
  onReveal: (assignmentId: number) => void;
  onSubmit: (assignmentId: number, result: StudyReviewSubmitResult) => void;
  onSetFlashRevealKey: (value: string) => void;
  hasPrev: boolean;
  hasNext: boolean;
};

export function useStudyReviewModalKeyboard({
  selectedItem,
  studyMode,
  viewerMode,
  flashRevealed,
  currentFlashKey,
  canUseFlashCycleNext,
  isAnswerRevealed,
  reviewOutcomeByAssignmentId,
  onCloseModal,
  onGoPrev,
  onGoNextItem,
  onAdvanceFlashOrNext,
  onReveal,
  onSubmit,
  onSetFlashRevealKey,
  hasPrev,
  hasNext,
}: UseStudyReviewModalKeyboardArgs) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedItem) return;

      const requiresReveal = studyMode && isReviewQueueItem(selectedItem);
      const selectedOutcome = reviewOutcomeByAssignmentId[selectedItem.assignmentId];
      const isOutcomeFinal =
        selectedOutcome === STUDY_REVIEW_OUTCOMES.correct ||
        selectedOutcome === STUDY_REVIEW_OUTCOMES.wrong;
      const key = event.key;
      const lowerKey = key.toLowerCase();
      const isPrevNav =
        key === "ArrowLeft" || key === "ArrowUp" || lowerKey === "a" || lowerKey === "w" || (key === "Enter" && event.shiftKey);
      const isNextNav =
        key === "ArrowRight" || key === "ArrowDown" || lowerKey === "d" || lowerKey === "s" || (key === "Enter" && !event.shiftKey);

      if (
        !studyMode &&
        viewerMode === STUDY_VIEWER_MODES.flash &&
        !flashRevealed &&
        key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        onSetFlashRevealKey(currentFlashKey);
        return;
      }

      if (
        key === "Escape" ||
        isPrevNav ||
        isNextNav ||
        key === " " ||
        lowerKey === "j" ||
        lowerKey === "k" ||
        key === "1" ||
        key === "2"
      ) {
        event.preventDefault();
      }

      if (key === "Escape") return onCloseModal();
      if (isPrevNav && hasPrev) return onGoPrev();
      if (isNextNav && (hasNext || canUseFlashCycleNext)) return onAdvanceFlashOrNext();

      if (key === " ") {
        if (!studyMode && viewerMode === STUDY_VIEWER_MODES.flash && !flashRevealed && !event.shiftKey) {
          onSetFlashRevealKey(currentFlashKey);
          return;
        }
        if (requiresReveal && !isAnswerRevealed && isReviewQueueItem(selectedItem)) {
          onReveal(selectedItem.assignmentId);
          return;
        }
        if (event.shiftKey && hasPrev) return onGoPrev();
        if (hasNext || canUseFlashCycleNext) return onAdvanceFlashOrNext();
      }

      if ((key === "1" || key === "2" || key === "j" || key === "J" || key === "k" || key === "K") && isReviewQueueItem(selectedItem)) {
        if (!studyMode || isOutcomeFinal) return;
        const canSubmit = !requiresReveal || isAnswerRevealed;
        if (!canSubmit) return;
        const isWrong = key === "1" || key.toLowerCase() === "j";
        onSubmit(
          selectedItem.assignmentId,
          isWrong ? STUDY_REVIEW_OUTCOMES.wrong : STUDY_REVIEW_OUTCOMES.correct,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canUseFlashCycleNext,
    currentFlashKey,
    flashRevealed,
    hasNext,
    hasPrev,
    isAnswerRevealed,
    onAdvanceFlashOrNext,
    onCloseModal,
    onGoNextItem,
    onGoPrev,
    onReveal,
    onSetFlashRevealKey,
    onSubmit,
    reviewOutcomeByAssignmentId,
    selectedItem,
    studyMode,
    viewerMode,
  ]);
}
