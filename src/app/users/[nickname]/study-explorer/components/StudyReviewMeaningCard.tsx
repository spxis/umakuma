import { useState } from "react";

import { STUDY_REVIEW_MODAL_SECTION_TEXT } from "./StudyExplorer.constants";

type Props = {
  allMeanings: string[];
  fallbackMeaning: string;
  selectedMeaningExplanation: string;
  selectedReadingExplanationRaw: string;
};

export default function StudyReviewMeaningCard({
  allMeanings,
  fallbackMeaning,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
}: Props) {
  const [peekExpanded, setPeekExpanded] = useState(false);

  const showReadingExplanation = selectedReadingExplanationRaw.length > 0;
  const hasMeaningExplanation = selectedMeaningExplanation !== "-";
  const hasInlineExplanations = hasMeaningExplanation || showReadingExplanation;
  const hasAltMeanings = allMeanings.length > 1;
  const hasScrollableMeaningDetails = hasAltMeanings || hasInlineExplanations;

  const meaningDetailContent = (
    <>
      {hasAltMeanings ? (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/55">{STUDY_REVIEW_MODAL_SECTION_TEXT.altMeanings}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/80 sm:text-xs">{allMeanings.slice(1).join(" • ")}</p>
        </div>
      ) : null}
      {hasMeaningExplanation ? (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/55">Meaning note</p>
          <p className="mt-1">{selectedMeaningExplanation}</p>
        </div>
      ) : null}
      {showReadingExplanation ? (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/55">Reading note</p>
          <p className="mt-1">{selectedReadingExplanationRaw}</p>
        </div>
      ) : null}
    </>
  );

  const peekDetailContent = (
    <>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/55">{STUDY_REVIEW_MODAL_SECTION_TEXT.meaning}</p>
        <p className="mt-1 text-base font-black leading-tight text-foreground sm:text-lg">{allMeanings[0] ?? fallbackMeaning}</p>
      </div>
      {meaningDetailContent}
    </>
  );

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.meaning}</p>
        {hasScrollableMeaningDetails ? (
          <button
            type="button"
            onClick={() => setPeekExpanded((value) => !value)}
            className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface"
          >
            {peekExpanded ? "Close peek" : "Peek"}
          </button>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-foreground sm:text-4xl">{allMeanings[0] ?? fallbackMeaning}</p>
      {hasScrollableMeaningDetails ? (
        <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-line/60 bg-surface-muted/70 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/75">
          {meaningDetailContent}
        </div>
      ) : null}
      {hasScrollableMeaningDetails && peekExpanded ? (
        <div className="absolute inset-0 z-20 rounded-xl border border-line bg-surface p-2.5 shadow-[0_12px_26px_rgba(8,16,36,0.16)] sm:p-3">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/60">Meaning details</p>
              <button
                type="button"
                onClick={() => setPeekExpanded(false)}
                className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface"
              >
                Close peek
              </button>
            </div>
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-line/60 bg-surface-muted/70 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/75">
              {peekDetailContent}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}