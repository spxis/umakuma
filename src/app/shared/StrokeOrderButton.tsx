"use client";

import { useState, type ReactNode } from "react";

import KanjiStrokeAnimation from "./KanjiStrokeAnimation";
import ModalShell from "./ModalShell";
import { MODAL_LAYERS } from "./modalLayers";
import { STROKE_ANIMATION_COPY } from "./strokeAnimationCopy";

type Props = {
  kanji: string;
  /** Skips a file when the caller knows which grade holds the character. */
  grade?: number;
  /** Shown in the modal header, so the reader knows what they opened. */
  meaning?: string | null;
  /** Pills and readings under the animation; each surface knows its own. */
  detail?: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/**
 * The character as a font draws it.
 *
 * Both faces are shown because they differ where it matters for handwriting:
 * Mincho keeps the tapered strokes and triangular stops a textbook shows, while
 * Gothic renders every stroke at one weight. A child copying strokes is really
 * copying the Mincho shape.
 */
function PrintedGlyph({ kanji, label, fontFamily }: { kanji: string; label: string; fontFamily: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        style={{ fontFamily }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl border border-kanji/40 bg-kanji/5 text-5xl font-black leading-none text-kanji"
        aria-hidden="true"
      >
        {kanji}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/40">{label}</span>
    </div>
  );
}

/**
 * Opens the stroke-order view for a character, from anywhere.
 *
 * Self-contained on purpose: the surfaces that want it — the grade cards, the
 * glyph viewer — are already at their line budget, and a character is all this
 * needs to work.
 */
export default function StrokeOrderButton({ kanji, grade, meaning, detail, size = "sm", className = "" }: Props) {
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
        <ModalShell
          onClose={() => setOpen(false)}
          closeOnBackdrop
          layer={MODAL_LAYERS.strokes}
          label={`${STROKE_ANIMATION_COPY.title} — ${kanji}`}
          panelClassName="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted/60 px-5 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/55">
                {STROKE_ANIMATION_COPY.title}
              </p>
              {meaning ? <p className="truncate text-sm font-bold text-foreground">{meaning}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={STROKE_ANIMATION_COPY.close}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-black text-foreground/70 transition hover:bg-surface-muted"
            >
              X
            </button>
          </header>

          <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-center">
            <div className="flex flex-row gap-3 sm:flex-col">
              <PrintedGlyph kanji={kanji} label={STROKE_ANIMATION_COPY.gothic} fontFamily="var(--font-jp-sans), sans-serif" />
              <PrintedGlyph kanji={kanji} label={STROKE_ANIMATION_COPY.mincho} fontFamily="var(--font-jp-serif), serif" />
            </div>

            <KanjiStrokeAnimation key={kanji} kanji={kanji} grade={grade} size={200} />
          </div>

          {detail ? <div className="border-t border-line px-5 py-3">{detail}</div> : null}
        </ModalShell>
      ) : null}
    </>
  );
}
