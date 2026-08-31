"use client";

import { useState, type ReactNode } from "react";

import KanjiDetailModal, { type KanjiDetailSummary } from "./KanjiDetailModal";
import { STROKE_ANIMATION_COPY } from "./strokeAnimationCopy";

type Props = {
  kanji: string;
  /** Skips a file when the caller knows which grade holds the character. */
  grade?: number;
  /** Shown in the modal header, so the reader knows what they opened. */
  meaning?: string | null;
  /** Readings and meaning together, which name a character better than a gloss. */
  summary?: KanjiDetailSummary;
  /** Where this character lives on its own, for sharing. */
  shareHref?: string;
  /** Pills and readings under the animation; each surface knows its own. */
  detail?: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Opens the stroke-order view for a character, from anywhere.
 *
 * Self-contained on purpose: the surfaces that want it — the grade cards, the
 * glyph viewer — are already at their line budget, and a character is all this
 * needs to work.
 */
export default function StrokeOrderButton({ kanji, grade, meaning, summary, shareHref, detail, size = "sm", className = "" }: Props) {
  const [open, setOpen] = useState(false);

  if ([...kanji].length !== 1) {
    return null;
  }

  const shell =
    size === "md"
      ? "h-9 px-4 text-[11px]"
      : "h-7 px-2.5 text-[10px]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={STROKE_ANIMATION_COPY.title}
        className={`inline-flex shrink-0 items-center rounded-full border border-line bg-surface font-black uppercase tracking-[0.06em] text-foreground/60 transition hover:bg-surface-muted hover:text-foreground ${shell} ${className}`.trim()}
      >
        {STROKE_ANIMATION_COPY.open}
      </button>

      {open ? (
        <KanjiDetailModal
          kanji={kanji}
          grade={grade}
          summary={summary ?? (meaning ? { meaning } : undefined)}
          shareHref={shareHref}
          detail={detail}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
