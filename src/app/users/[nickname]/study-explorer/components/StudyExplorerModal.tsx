import StudyReviewModal from "./StudyReviewModal";
import StudySideBySideModal from "./StudySideBySideModal";
import {
  STUDY_QUEUE_TYPES,
  STUDY_REVIEW_OUTCOMES,
  STUDY_REVIEW_TERMINAL_OUTCOMES,
} from "./StudyExplorer.constants";
import type {
  ReviewOutcome,
  ReviewSrsTransition,
  StudyQueueMode,
  StudyQueueItem,
  StudyReviewAnswerType,
  StudyModeBehavior,
  StudyReviewSubmitResult,
  StudySource,
  StudyViewerMode,
  SubmitFeedback,
  SubmitInFlight,
} from "../lib/studyExplorerTypes";

type Props = {
  accountId: string;
  currentLevel: number | null;
  showEnglish: boolean;
  canToggleEnglish: boolean;
  forcedViewerMode: StudyViewerMode | null;
  isUnauthorized: boolean;
  studyMode: boolean;
  studyModeBehavior: StudyModeBehavior;
  studySource: StudySource;
  queueMode: StudyQueueMode;
  selectedItem: StudyQueueItem | null;
  selectedIndex: number;
  modalItems: StudyQueueItem[];
  prevItem: StudyQueueItem | null;
  nextItem: StudyQueueItem | null;
  filteredItems: StudyQueueItem[];
  isSelectedSubmitted: boolean;
  isAnswerRevealed: boolean;
  isSubmittingSelected: boolean;
  submitInFlight: SubmitInFlight | null;
  submitFeedback: SubmitFeedback | null;
  latestReviewTransition: ReviewSrsTransition | null;
  reviewOutcomeByAssignmentId: Record<number, ReviewOutcome>;
  onSetReviewOutcomeByAssignmentId: React.Dispatch<React.SetStateAction<Record<number, ReviewOutcome>>>;
  onSetSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  onSetRevealedAssignmentIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  onClose: () => void;
  onToggleShowEnglish: () => void;
  onSubmit: (assignmentId: number, result: StudyReviewSubmitResult, answerType?: StudyReviewAnswerType) => Promise<void>;
  onStartLesson: (assignmentId: number) => Promise<void>;
  onResetToLessons: (assignmentId: number) => Promise<void>;
};

export default function StudyExplorerModal({
  accountId,
  currentLevel,
  showEnglish,
  canToggleEnglish,
  forcedViewerMode,
  isUnauthorized,
  studyMode,
  studyModeBehavior,
  studySource,
  queueMode,
  selectedItem,
  selectedIndex,
  modalItems,
  prevItem,
  nextItem,
  filteredItems,
  isSelectedSubmitted,
  isAnswerRevealed,
  isSubmittingSelected,
  submitInFlight,
  submitFeedback,
  latestReviewTransition,
  reviewOutcomeByAssignmentId,
  onSetReviewOutcomeByAssignmentId,
  onSetSelectedId,
  onSetRevealedAssignmentIds,
  onClose,
  onToggleShowEnglish,
  onSubmit,
  onStartLesson,
  onResetToLessons,
}: Props) {
  if (isUnauthorized) {
    return null;
  }

  if (
    studyModeBehavior === "side-by-side" &&
    studySource === "wanikani" &&
    queueMode === STUDY_QUEUE_TYPES.review &&
    selectedItem &&
    !selectedItem.isInjectedTrouble
  ) {
    return (
      <StudySideBySideModal
        accountId={accountId}
        selectedItem={selectedItem}
        selectedIndex={selectedIndex}
        total={modalItems.length}
        isSubmitting={isSubmittingSelected}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <StudyReviewModal
      accountId={accountId}
      currentLevel={currentLevel}
      showEnglish={showEnglish}
      canToggleEnglish={canToggleEnglish}
      forcedViewerMode={forcedViewerMode}
      studyMode={studyMode}
      selectedItem={selectedItem}
      selectedIndex={selectedIndex}
      filteredTotal={modalItems.length}
      prevLabel={prevItem?.characters ?? null}
      nextLabel={nextItem?.characters ?? null}
      isSelectedSubmitted={isSelectedSubmitted}
      isAnswerRevealed={isAnswerRevealed}
      isSubmittingSelected={isSubmittingSelected}
      submitInFlight={submitInFlight}
      submitFeedback={submitFeedback}
      latestReviewTransition={latestReviewTransition}
      reviewOutcomeByAssignmentId={reviewOutcomeByAssignmentId}
      onMarkSkipped={(assignmentId: number) => {
        onSetReviewOutcomeByAssignmentId((prev) => {
          const current = prev[assignmentId];
          if (current && STUDY_REVIEW_TERMINAL_OUTCOMES.has(current)) {
            return prev;
          }

          return { ...prev, [assignmentId]: STUDY_REVIEW_OUTCOMES.skipped };
        });
      }}
      onClose={onClose}
      onToggleShowEnglish={onToggleShowEnglish}
      onPrev={
        prevItem
          ? () => {
              onSetSelectedId(prevItem.subjectId);
            }
          : null
      }
      onNext={
        nextItem
          ? () => {
              onSetSelectedId(nextItem.subjectId);
            }
          : null
      }
      onRestartFromBeginning={
        filteredItems.length > 0
          ? () => {
              onSetSelectedId(filteredItems[0]?.subjectId ?? null);
            }
          : null
      }
      onReveal={(assignmentId: number) => {
        onSetRevealedAssignmentIds((prev) => new Set(prev).add(assignmentId));
      }}
      onSubmit={onSubmit}
      onStartLesson={onStartLesson}
      onResetToLessons={onResetToLessons}
    />
  );
}
