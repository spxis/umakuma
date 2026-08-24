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
    if (!comparison || isSubmitting) return;
    onSubmit(
      selectedItem.assignmentId,
      subjectId === selectedItem.subjectId ? "correct" : "wrong",
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
          <div className="grid h-80 min-h-[20rem] shrink-0 grid-cols-2 gap-2 sm:gap-5">
            {options.map((option) => (
              <button
                key={option.subjectId}
                type="button"
                disabled={isSubmitting}
                onClick={() => choose(option.subjectId)}
                className={`relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border p-2 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:opacity-50 sm:p-6 ${typeGlyphBoxClass(option.subjectType)}`}
              >
                <span className="absolute right-2 top-2 rounded-full border border-line bg-surface/90 px-2 py-1 text-[10px] font-bold text-foreground sm:right-4 sm:top-4 sm:text-xs">L{option.wkLevel}</span>
                <span style={{ fontFamily }} className="max-w-full break-all text-center text-[clamp(3rem,15vw,10rem)] font-black leading-none">{option.characters}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted px-3 py-3 text-center sm:mt-5 sm:px-5 sm:py-4">
            {comparison ? (
              <>
                <p className="text-[10px] font-bold uppercase text-foreground/60 sm:text-xs">Choose the item with this {comparison.answerType}</p>
                <p className="mt-1 text-2xl font-black text-foreground sm:text-4xl">{comparison.prompt}</p>
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