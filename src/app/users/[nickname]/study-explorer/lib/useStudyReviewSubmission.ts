import { showXpEarned, type XpEarned } from "@/lib/xp/xpToast";
import { useCallback, useRef } from "react";

import type {
  ReviewOutcome,
  StudyModeBehavior,
  StudyCounts,
  StudyQueueMode,
  StudyQueueItem,
  ReviewSrsTransition,
  StudyReviewAnswerType,
  SubmitFeedback,
  SubmitInFlight,
} from "./studyExplorerTypes";
import { STUDY_QUEUE_TYPES } from "./studyExplorerDomain";
import { studyItemEnglishTitle } from "./studyExplorerUtils";
import { nextReviewSessionItem } from "./reviewSessionNavigation";
import { REVIEW_RESULTS } from "@/lib/domainConstants";

const REVIEW_SUBMIT_TIMEOUT_MS = 10000;
const LESSON_AUTO_ADVANCE_DELAY_MS = 1000;

type Args = {
  accountId: string;
  studyApiBasePath: string;
  customLibraryId: string | null;
  queueMode: StudyQueueMode;
  studyModeBehavior: StudyModeBehavior;
  modalItems: StudyQueueItem[];
  selectedItem: StudyQueueItem | null;
  onSetLoadedItems: React.Dispatch<React.SetStateAction<StudyQueueItem[]>>;
  onSetTotalItems: React.Dispatch<React.SetStateAction<number>>;
  onSetPersistedCounts: React.Dispatch<React.SetStateAction<StudyCounts | null>>;
  onSetSubmitFeedback: React.Dispatch<React.SetStateAction<SubmitFeedback | null>>;
  onSetLatestReviewTransition: React.Dispatch<React.SetStateAction<ReviewSrsTransition | null>>;
  onSetSubmitInFlight: React.Dispatch<React.SetStateAction<SubmitInFlight | null>>;
  onSetSubmittingByAssignmentId: React.Dispatch<React.SetStateAction<Set<number>>>;
  onSetRevealedAssignmentIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  onSetReviewOutcomeByAssignmentId: React.Dispatch<React.SetStateAction<Record<number, ReviewOutcome>>>;
  onSetHiddenSubmittedAssignmentIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  onSetSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  onSetModalSessionOrderByAssignmentId: React.Dispatch<React.SetStateAction<number[] | null>>;
  onSetModalSessionItemByAssignmentId: React.Dispatch<React.SetStateAction<Record<number, StudyQueueItem>>>;
};

export function useStudyReviewSubmission({
  accountId,
  studyApiBasePath,
  customLibraryId,
  queueMode,
  studyModeBehavior,
  modalItems,
  selectedItem,
  onSetLoadedItems,
  onSetTotalItems,
  onSetPersistedCounts,
  onSetSubmitFeedback,
  onSetLatestReviewTransition,
  onSetSubmitInFlight,
  onSetSubmittingByAssignmentId,
  onSetRevealedAssignmentIds,
  onSetReviewOutcomeByAssignmentId,
  onSetHiddenSubmittedAssignmentIds,
  onSetSelectedId,
  onSetModalSessionOrderByAssignmentId,
  onSetModalSessionItemByAssignmentId,
}: Args) {
  const inFlightAssignmentIdsRef = useRef<Set<number>>(new Set());

  const getSubmissionContext = useCallback(
    (assignmentId: number) => {
      const itemForSubmit =
        modalItems.find((item) => item.assignmentId === assignmentId) ?? selectedItem ?? null;
      const submittedIndex = modalItems.findIndex((item) => item.assignmentId === assignmentId);
      const nextVisibleItem =
        submittedIndex >= 0
          ? modalItems[submittedIndex + 1] ?? modalItems[submittedIndex - 1] ?? itemForSubmit
          : itemForSubmit;
      const nextFocusedItem = nextReviewSessionItem(modalItems, assignmentId);

      return { itemForSubmit, nextFocusedItem, nextVisibleItem };
    },
    [modalItems, selectedItem],
  );

  const submitReview = useCallback(
    async (
      assignmentId: number,
      result: "correct" | "wrong",
      answerType: StudyReviewAnswerType = "combined",
    ) => {
      if (inFlightAssignmentIdsRef.current.has(assignmentId)) {
        return;
      }
      inFlightAssignmentIdsRef.current.add(assignmentId);

      const { itemForSubmit, nextFocusedItem, nextVisibleItem } = getSubmissionContext(assignmentId);

      onSetSubmitInFlight({
        assignmentId,
        result,
        itemLabel: itemForSubmit
          ? `${itemForSubmit.characters} (${studyItemEnglishTitle(itemForSubmit)})`
          : "item",
      });
      onSetSubmittingByAssignmentId((prev) => new Set(prev).add(assignmentId));

      if (itemForSubmit) {
        onSetModalSessionItemByAssignmentId((prev) => ({ ...prev, [assignmentId]: itemForSubmit }));
      }

      if (itemForSubmit?.isInjectedTrouble && result === REVIEW_RESULTS.wrong) {
        onSetRevealedAssignmentIds((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetSelectedId(nextVisibleItem?.subjectId ?? itemForSubmit.subjectId ?? null);
        inFlightAssignmentIdsRef.current.delete(assignmentId);
        onSetSubmittingByAssignmentId((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetSubmitInFlight(null);
        return;
      }

      try {
        const submitController = new AbortController();
        const submitTimeout = window.setTimeout(() => {
          submitController.abort();
        }, REVIEW_SUBMIT_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(`${studyApiBasePath}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assignmentId,
              result,
              answerType,
              ...(itemForSubmit?.isInjectedTrouble
                ? { practiceSubjectId: itemForSubmit.subjectId, practiceType: "trouble" as const }
                : {}),
              ...(customLibraryId ? { libraryId: customLibraryId } : {}),
            }),
            signal: submitController.signal,
          });
        } catch (networkError) {
          if (networkError instanceof DOMException && networkError.name === "AbortError") {
            throw new Error("Review submission timed out. Please retry.");
          }
          throw networkError;
        } finally {
          window.clearTimeout(submitTimeout);
        }

        const payload = (await response.json()) as {
          error?: string;
          xpAwarded?: number;
          xpEarned?: XpEarned;
          review?: ReviewSrsTransition;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not submit review.");
        }

        /* Every award this answer paid, including the ones that settle with
           the day - the sign-in, a streak milestone, a finished quest. Raised
           here rather than in the modal because the modal only knows about
           the review's own XP, and a hundred-day streak earned mid-review was
           being thrown away. */
        showXpEarned(payload.xpEarned);

        /* A stage change is a cue; so is the XP the answer paid, even when
           the stage held - a member who turned up should see it count. */
        const xpAwarded = typeof payload.xpAwarded === "number" ? payload.xpAwarded : 0;
        if (
          payload.review &&
          (payload.review.transition === "promoted" || payload.review.transition === "demoted" || xpAwarded > 0)
        ) {
          onSetLatestReviewTransition({ ...payload.review, xpAwarded });
        }

        if (!itemForSubmit?.isInjectedTrouble) {
          onSetReviewOutcomeByAssignmentId((prev) => ({ ...prev, [assignmentId]: result }));
        }

        onSetHiddenSubmittedAssignmentIds((prev) => {
          const next = new Set(prev);
          next.add(assignmentId);
          return next;
        });
        onSetLoadedItems((prev) => prev.filter((item) => item.assignmentId !== assignmentId));
        onSetTotalItems((prev) => Math.max(0, prev - 1));
        onSetPersistedCounts((prev) => {
          if (!prev) {
            return prev;
          }

          const consumeReviewCount = !(itemForSubmit?.isInjectedTrouble);

          const nextReviews =
            queueMode === STUDY_QUEUE_TYPES.review && consumeReviewCount
              ? Math.max(0, prev.reviews - 1)
              : prev.reviews;
          const nextLessons =
            queueMode === STUDY_QUEUE_TYPES.lesson ? Math.max(0, prev.lessons - 1) : prev.lessons;

          return {
            all: Math.max(0, nextReviews + nextLessons),
            reviews: nextReviews,
            lessons: nextLessons,
          };
        });
        onSetSelectedId(nextFocusedItem?.subjectId ?? itemForSubmit?.subjectId ?? null);
        onSetRevealedAssignmentIds((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });

        if (studyModeBehavior === "oneshot") {
          onSetSelectedId(null);
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wr:study-review-submitted", {
              detail: { accountId, subjectId: itemForSubmit?.subjectId },
            }),
          );
        }
      } catch (submitError: unknown) {
        onSetReviewOutcomeByAssignmentId((prev) => {
          const next = { ...prev };
          delete next[assignmentId];
          const rest = next;
          return rest;
        });
        onSetSubmitFeedback({
          kind: "error",
          message: submitError instanceof Error ? submitError.message : "Could not submit review.",
        });
        console.error("[UmaKuma] Review submission failed for assignment", assignmentId, submitError);
      } finally {
        inFlightAssignmentIdsRef.current.delete(assignmentId);
        onSetSubmittingByAssignmentId((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetSubmitInFlight(null);
      }
    },
    [
      accountId,
      customLibraryId,
      queueMode,
      studyModeBehavior,
      getSubmissionContext,
      onSetHiddenSubmittedAssignmentIds,
      onSetLoadedItems,
      onSetModalSessionItemByAssignmentId,
      onSetPersistedCounts,
      onSetRevealedAssignmentIds,
      onSetReviewOutcomeByAssignmentId,
      onSetSelectedId,
      onSetSubmitFeedback,
      onSetLatestReviewTransition,
      onSetSubmitInFlight,
      onSetSubmittingByAssignmentId,
      onSetTotalItems,
      studyApiBasePath,
      inFlightAssignmentIdsRef,
    ],
  );

  const submitLessonStart = useCallback(
    async (assignmentId: number) => {
      const { itemForSubmit, nextFocusedItem } = getSubmissionContext(assignmentId);

      onSetSubmitInFlight({
        assignmentId,
        result: "start-lesson",
        itemLabel: itemForSubmit
          ? `${itemForSubmit.characters} (${studyItemEnglishTitle(itemForSubmit)})`
          : "item",
      });
      onSetSubmittingByAssignmentId((prev) => new Set(prev).add(assignmentId));

      try {
        const response = await fetch(`${studyApiBasePath}/lesson/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId,
            ...(customLibraryId ? { libraryId: customLibraryId } : {}),
          }),
        });
        const payload = (await response.json()) as { error?: string; xpEarned?: XpEarned };
        if (!response.ok) throw new Error(payload.error ?? "Could not start lesson.");
        showXpEarned(payload.xpEarned);

        if (itemForSubmit) {
          onSetModalSessionItemByAssignmentId((prev) => ({ ...prev, [assignmentId]: itemForSubmit }));
        }

        onSetSubmitFeedback({
          kind: "success",
          message: `Added ${
            itemForSubmit ? `${itemForSubmit.characters} (${studyItemEnglishTitle(itemForSubmit)})` : "item"
          } to reviews.`,
        });

        onSetHiddenSubmittedAssignmentIds((prev) => {
          const next = new Set(prev);
          next.add(assignmentId);
          return next;
        });
        onSetReviewOutcomeByAssignmentId((prev) => ({ ...prev, [assignmentId]: "lesson-started" }));
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, LESSON_AUTO_ADVANCE_DELAY_MS);
        });

        onSetSelectedId((currentSelectedId) =>
          currentSelectedId === itemForSubmit?.subjectId
            ? (nextFocusedItem?.subjectId ?? null)
            : currentSelectedId,
        );

        if (studyModeBehavior === "oneshot") {
          onSetSelectedId(null);
        }
      } catch (submitError) {
        onSetSubmitFeedback({
          kind: "error",
          message: submitError instanceof Error ? submitError.message : "Could not start lesson.",
        });
      } finally {
        onSetSubmittingByAssignmentId((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetRevealedAssignmentIds((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetSubmitInFlight(null);
      }
    },
    [
      customLibraryId,
      getSubmissionContext,
      onSetHiddenSubmittedAssignmentIds,
      onSetSelectedId,
      onSetModalSessionItemByAssignmentId,
      onSetRevealedAssignmentIds,
      onSetReviewOutcomeByAssignmentId,
      onSetSubmitFeedback,
      onSetSubmitInFlight,
      onSetSubmittingByAssignmentId,
      studyModeBehavior,
      studyApiBasePath,
    ],
  );

  const submitResetToLessons = useCallback(
    async (assignmentId: number) => {
      const { itemForSubmit } = getSubmissionContext(assignmentId);

      onSetSubmitInFlight({
        assignmentId,
        result: "reset-to-lessons",
        itemLabel: itemForSubmit
          ? `${itemForSubmit.characters} (${studyItemEnglishTitle(itemForSubmit)})`
          : "item",
      });
      onSetSubmittingByAssignmentId((prev) => new Set(prev).add(assignmentId));

      try {
        onSetSubmitFeedback({
          kind: "error",
          message:
            "Per-item reset is not available in the official WaniKani API. Use WaniKani account reset for level resets.",
        });
      } catch (submitError) {
        onSetSubmitFeedback({
          kind: "error",
          message: submitError instanceof Error ? submitError.message : "Could not reset item to lessons.",
        });
      } finally {
        onSetSubmittingByAssignmentId((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetRevealedAssignmentIds((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
        onSetSubmitInFlight(null);
      }
    },
    [
      getSubmissionContext,
      onSetRevealedAssignmentIds,
      onSetSubmitFeedback,
      onSetSubmitInFlight,
      onSetSubmittingByAssignmentId,
    ],
  );

  const closeReviewSession = useCallback(() => {
    onSetSelectedId(null);
    onSetReviewOutcomeByAssignmentId({});
    onSetModalSessionOrderByAssignmentId(null);
    onSetModalSessionItemByAssignmentId({});
    onSetSubmitFeedback(null);
    onSetSubmitInFlight(null);
    onSetRevealedAssignmentIds(new Set());
  }, [
    onSetModalSessionItemByAssignmentId,
    onSetModalSessionOrderByAssignmentId,
    onSetReviewOutcomeByAssignmentId,
    onSetRevealedAssignmentIds,
    onSetSelectedId,
    onSetSubmitFeedback,
    onSetSubmitInFlight,
  ]);

  return { submitReview, submitLessonStart, submitResetToLessons, closeReviewSession };
}
