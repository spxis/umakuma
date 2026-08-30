"use client";

import ModalShell from "@/app/shared/ModalShell";
import KanjiStrokeAnimation from "@/app/shared/KanjiStrokeAnimation";
import { STROKE_ANIMATION_COPY } from "@/app/shared/strokeAnimationCopy";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";

type Props = {
  kanji: string;
  meaning: string | null;
  grade: number;
  onClose: () => void;
};

/**
 * The stroke-order view for one character.
 *
 * Informational, so it dismisses on a click beside it: nothing here is typed or
 * decided, and an undismissable panel would be the worse failure.
 */
export default function GradeStrokeModal({ kanji, meaning, grade, onClose }: Props) {
  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop
      layer={MODAL_LAYERS.page}
      label={`${STROKE_ANIMATION_COPY.title} — ${kanji}`}
      panelClassName="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
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
          onClick={onClose}
          aria-label={STROKE_ANIMATION_COPY.close}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-black text-foreground/70 transition hover:bg-surface-muted"
        >
          X
        </button>
      </header>

      <div className="flex items-center justify-center px-5 py-6">
        <KanjiStrokeAnimation key={kanji} kanji={kanji} grade={grade} size={220} />
      </div>
    </ModalShell>
  );
}
