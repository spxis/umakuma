"use client";

import { useEffect, useState } from "react";

import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import type {
  StudyComparisonResponse,
  StudyQueueItem,
  StudyReviewAnswerType,
  StudyReviewSubmitResult,
} from "../lib/studyExplorerTypes";
import { typeGlyphBoxClass } from "../../level-explorer/lib/levelExplorerDisplay";
import StudyModalCloseButton from "./StudyModalCloseButton";
import { STUDY_REVIEW_MODAL_SECTION_TEXT } from "./StudyExplorer.constants";

type Props = {
  accountId: string;
  selectedItem: StudyQueueItem;
  selectedIndex: number;
  total: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    assignmentId: number,
    result: StudyReviewSubmitResult,
    answerType?: StudyReviewAnswerType,
  ) => void;
};

export default function StudySideBySideModal({
  accountId,
  selectedItem,
  selectedIndex,
  total,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const { fontFamily } = useGlyphFontPreference();
  const [result, setResult] = useState<{
    subjectId: number;
    comparison: StudyComparisonResponse | null;
    error: string | null;
  }>({ subjectId: 0, comparison: null, error: null });
  const comparison = result.subjectId === selectedItem.subjectId ? result.comparison : null;
  const error = result.subjectId === selectedItem.subjectId ? result.error : null;
  const [selection, setSelection] = useState<{ targetSubjectId: number; selectedSubjectId: number } | null>(null);
  const activeSelection = selection?.targetSubjectId === selectedItem.subjectId ? selection : null;
  const targetOnLeft = selectedItem.subjectId % 2 === 0;

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/study/${accountId}/comparison?subjectId=${selectedItem.subjectId}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as StudyComparisonResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load comparison.");
        setResult({ subjectId: selectedItem.subjectId, comparison: payload, error: null });
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setResult({
          subjectId: selectedItem.subjectId,
          comparison: null,
          error: fetchError instanceof Error ? fetchError.message : "Could not load comparison.",
        });
      });

    return () => controller.abort();
  }, [accountId, selectedItem.subjectId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const choose = (subjectId: number) => {
    if (!comparison || isSubmitting || activeSelection) return;
    setSelection({ targetSubjectId: selectedItem.subjectId, selectedSubjectId: subjectId });
  };

  const continueReview = () => {
    if (!comparison || !activeSelection || isSubmitting) return;
    onSubmit(
      selectedItem.assignmentId,
      activeSelection.selectedSubjectId === selectedItem.subjectId ? "correct" : "wrong",
      comparison.answerType,
    );
  };

  const targetOption = {
    subjectId: selectedItem.subjectId,
    subjectType: selectedItem.subjectType ?? "vocabulary",
    wkLevel: selectedItem.wkLevel ?? 1,
    characters: selectedItem.characters,
    primaryMeaning: selectedItem.meanings[0] ?? null,
    primaryReading: selectedItem.primaryReadings?.[0] ?? selectedItem.readings?.[0] ?? null,
  };
  const options = comparison
    ? targetOnLeft
      ? [targetOption, comparison.distractor]
      : [comparison.distractor, targetOption]
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(8,16,36,0.72)] p-2 backdrop-blur-[2px] sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_26px_75px_rgba(0,0,0,0.35)] sm:rounded-[1.8rem]">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-surface-muted px-3 py-2 sm:px-6 sm:py-3">
          <StudyModalCloseButton onClick={onClose} />
          <p className="text-xs font-bold uppercase text-foreground/70">#{selectedIndex + 1} of {total}</p>
          <span />
        </header>

        <main className="flex min-h-0 flex-1 flex-col p-3 sm:p-6">
          <div className="grid h-80 min-h-80 shrink-0 grid-cols-2 gap-2 sm:gap-5">
            {options.map((option) => {
              const isCorrectOption = option.subjectId === selectedItem.subjectId;
              const isSelectedOption = activeSelection?.selectedSubjectId === option.subjectId;
              const revealedLabel = comparison?.answerType === "reading"
                ? STUDY_REVIEW_MODAL_SECTION_TEXT.reading
                : STUDY_REVIEW_MODAL_SECTION_TEXT.meaning;
              const revealedValue = comparison?.answerType === "reading"
                ? option.primaryReading
                : option.primaryMeaning;
              const resultTone = activeSelection
                ? isCorrectOption
                  ? "border-emerald-500"
                  : isSelectedOption
                    ? "border-red-500"
                    : null
                : null;

              return (
                <button
                  key={option.subjectId}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => choose(option.subjectId)}
                  className={`relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border p-2 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:opacity-50 sm:p-6 ${typeGlyphBoxClass(option.subjectType)}`}
                >
                  {resultTone ? <span aria-hidden className={`pointer-events-none absolute inset-0 z-20 rounded-2xl border-4 ${resultTone}`} /> : null}
                  {activeSelection && (isCorrectOption || isSelectedOption) ? (
                    <span className={`absolute left-2 top-2 z-30 rounded-full px-2 py-1 text-[10px] font-black uppercase text-white sm:left-4 sm:top-4 sm:text-xs ${isCorrectOption ? "bg-emerald-600" : "bg-red-600"}`}>
                      {isCorrectOption ? STUDY_REVIEW_MODAL_SECTION_TEXT.correct : STUDY_REVIEW_MODAL_SECTION_TEXT.notQuite}
                    </span>
                  ) : null}
                  <span className="absolute right-2 top-2 z-30 rounded-full border border-line bg-surface/90 px-2 py-1 text-[10px] font-bold text-foreground sm:right-4 sm:top-4 sm:text-xs">L{option.wkLevel}</span>
                  <span style={{ fontFamily }} className={`max-w-full break-all text-center font-black leading-none ${activeSelection ? "text-[clamp(2.5rem,10vw,6rem)]" : "text-[clamp(3rem,15vw,10rem)]"}`}>{option.characters}</span>
                  {activeSelection ? (
                    <span className="mt-4 w-full rounded-lg border border-line bg-surface/90 px-2 py-2 text-left">
                      <span className="block text-[9px] font-bold uppercase text-foreground/60">{revealedLabel}</span>
                      <span className="mt-1 block truncate text-sm font-black text-foreground sm:text-lg">{revealedValue ?? "-"}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted px-3 py-3 text-center sm:mt-5 sm:px-5 sm:py-4">
            {comparison ? (
              <>
                <p className={`text-[10px] font-bold uppercase sm:text-xs ${activeSelection ? (activeSelection.selectedSubjectId === selectedItem.subjectId ? "text-emerald-700" : "text-red-700") : "text-foreground/60"}`}>
                  {activeSelection
                    ? activeSelection.selectedSubjectId === selectedItem.subjectId
                      ? STUDY_REVIEW_MODAL_SECTION_TEXT.correct
                      : STUDY_REVIEW_MODAL_SECTION_TEXT.notQuite
                    : `Choose the item with this ${comparison.answerType}`}
                </p>
                <p className="mt-1 text-2xl font-black text-foreground sm:text-4xl">{comparison.prompt}</p>
                {activeSelection ? (
                  <button
                    type="button"
                    onClick={continueReview}
                    disabled={isSubmitting}
                    className="mt-4 min-h-10 rounded-full border border-accent bg-accent px-6 py-2 text-sm font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? STUDY_REVIEW_MODAL_SECTION_TEXT.submitting : STUDY_REVIEW_MODAL_SECTION_TEXT.continue}
                  </button>
                ) : null}
              </>
            ) : error ? (
              <p className="text-sm font-bold text-red-700">{error}</p>
            ) : (
              <p className="text-sm font-bold text-foreground/65">Loading comparison...</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}