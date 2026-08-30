"use client";

import ModalShell from "@/app/shared/ModalShell";
import KanjiStrokeAnimation from "@/app/shared/KanjiStrokeAnimation";
import { STROKE_ANIMATION_COPY } from "@/app/shared/strokeAnimationCopy";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import { GRADE_SHORT_LABELS, displayReading, isGradeOption, readingsForGrade } from "./gradeExplorerView";

type Props = {
  entry: SchoolGradeKanjiEntry;
  onClose: () => void;
};

/**
 * The character as a font draws it.
 *
 * Both faces are shown because they differ where it matters for handwriting:
 * Mincho keeps the tapered strokes and the little triangular stops a textbook
 * shows, while Gothic renders every stroke at one weight. A child copying
 * strokes is really copying the Mincho shape.
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

function ReadingLine({ label, readings }: { label: string; readings: string[] }) {
  if (readings.length === 0) {
    return null;
  }

  return (
    <p className="flex items-baseline gap-1.5 text-xs">
      <span className="shrink-0 font-black uppercase tracking-[0.08em] text-foreground/45">{label}</span>
      <span className="font-bold text-foreground/80 [font-family:var(--font-jp-current)]">
        {readings.map(displayReading).join("、")}
      </span>
    </p>
  );
}

/**
 * The stroke-order view for one character.
 *
 * The printed character sits beside the animation deliberately: a child copying
 * strokes needs something to compare their result against, and the animated
 * version ends up as a skeleton of lines rather than the shape the font draws.
 *
 * Informational, so it dismisses on a click beside it — nothing here is typed
 * or decided, and an undismissable panel would be the worse failure.
 */
export default function GradeStrokeModal({ entry, onClose }: Props) {
  const readings = readingsForGrade(entry);

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop
      layer={MODAL_LAYERS.page}
      label={`${STROKE_ANIMATION_COPY.title} — ${entry.kanji}`}
      panelClassName="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted/60 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/55">
            {STROKE_ANIMATION_COPY.title}
          </p>
          {entry.primaryMeaning ? (
            <p className="truncate text-sm font-bold text-foreground">{entry.primaryMeaning}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={STROKE_ANIMATION_COPY.close}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-black text-foreground/70 transition hover:bg-surface-muted"
        >
          X
        </button>
      </header>

      <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-center">
        <div className="flex flex-row gap-3 sm:flex-col">
          <PrintedGlyph
            kanji={entry.kanji}
            label={STROKE_ANIMATION_COPY.gothic}
            fontFamily="var(--font-jp-sans), sans-serif"
          />
          <PrintedGlyph
            kanji={entry.kanji}
            label={STROKE_ANIMATION_COPY.mincho}
            fontFamily="var(--font-jp-serif), serif"
          />
        </div>

        <KanjiStrokeAnimation key={entry.kanji} kanji={entry.kanji} grade={entry.grade} size={200} />
      </div>

      <div className="border-t border-line px-5 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {isGradeOption(entry.grade) ? (
            <span className="subject-pill border-kanji/40 bg-kanji/10 text-kanji">
              {GRADE_SHORT_LABELS[entry.grade]}
            </span>
          ) : null}
          {typeof entry.crossRef?.jlptLevel === "number" ? (
            <span className="subject-pill border-emerald-300 bg-emerald-50 text-emerald-700">
              {GRADE_EXPLORER_COPY.jlptCrossRef} N{entry.crossRef.jlptLevel}
            </span>
          ) : null}
          {typeof entry.crossRef?.wanikaniLevel === "number" ? (
            <span className="subject-pill border-line bg-surface text-foreground">
              {GRADE_EXPLORER_COPY.wanikaniCrossRef} L{entry.crossRef.wanikaniLevel}
            </span>
          ) : null}
          {typeof entry.frequencyRank === "number" ? (
            <span className="subject-pill border-line bg-surface text-foreground">
              #{entry.frequencyRank}
            </span>
          ) : null}
        </div>

        <ReadingLine label={GRADE_EXPLORER_COPY.onReadings} readings={readings.on} />
        <ReadingLine label={GRADE_EXPLORER_COPY.kunReadings} readings={readings.kun} />
      </div>
    </ModalShell>
  );
}
