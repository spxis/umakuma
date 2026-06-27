import type { TouchEvent } from "react";
import type {
  ReviewOutcome,
  StudyQueueItem,
  StudyReviewSubmitResult,
  StudyViewerMode,
} from "../lib/studyExplorerTypes";
import type { SubjectType } from "@/lib/domainConstants";
import type { RelatedReference } from "./StudyReviewModal.types";

export type StudyReviewModalSectionProps = {
  accountId: string;
  studyMode: boolean;
  showEnglish: boolean;
  canToggleEnglish: boolean;
  viewerMode: StudyViewerMode;
  selectedItem: StudyQueueItem;
  isPracticeItem: boolean;
  selectedOutcome: ReviewOutcome | undefined;
  isSubmittingSelected: boolean;
  submitFeedback: { kind: "success" | "error"; message: string } | null;
  requiresReveal: boolean;
  isAnswerRevealed: boolean;
  isOutcomeFinal: boolean;
  detailsRevealed: boolean;
  useStudyFlashLayout: boolean;
  flashCycleDone: boolean;
  flashRevealed: boolean;
  currentFlashKey: string;
  allMeanings: string[];
  primaryReadingHiragana: string;
  primaryReadingKatakana: string;
  secondaryReadingValue: string;
  hasRadicals: boolean;
  hasVisuallySimilar: boolean;
  hasUsedInVocabulary: boolean;
  hasComponentKanji: boolean;
  usedKanjiItems: RelatedReference[];
  usedInVocabularyCollapsed: boolean;
  usedKanjiCollapsed: boolean;
  usedInWordsCollapsed: boolean;
  jlptGradeLabel: string;
  wrong: number;
  skipped: number;
  correct: number;
  glyphViewerItems?: StudyQueueItem[];
  glyphViewerIndex?: number;
  onReveal: (assignmentId: number) => void;
  onSubmit: (assignmentId: number, result: StudyReviewSubmitResult) => void;
  onSkipCurrent: () => void;
  onStartLesson: (assignmentId: number) => void;
  onAdvanceFlashOrNext: () => void;
  onFlashTouchStart: (event: TouchEvent) => void;
  onFlashTouchEnd: (event: TouchEvent) => void;
  onSetFlashRevealKey: (value: string) => void;
  onToggleUsedInVocabularyCollapsed: () => void;
  onToggleUsedKanjiCollapsed: () => void;
  onToggleUsedInWordsCollapsed: () => void;
  onToggleShowEnglish: () => void;
  onOpenRelatedSubject?: (subjectId: number, fallbackType: SubjectType) => void | Promise<void>;
};
