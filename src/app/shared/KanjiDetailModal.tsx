"use client";

import { useState, type ReactNode } from "react";

import KanjiStrokeAnimation, { type StrokeMeta } from "./KanjiStrokeAnimation";
import ModalShell from "./ModalShell";
import { MODAL_LAYERS } from "./modalLayers";
import { STROKE_ANIMATION_COPY } from "./strokeAnimationCopy";
import { noTranslateClass } from "./japaneseText";
import JapaneseInProse from "./JapaneseInProse";

export type KanjiDetailSummary = {
  /** The English meaning, if the surface knows one. */
  meaning?: string | null;
  /** On readings, already display-formatted. */
  on?: string[];
  /** Kun readings, already display-formatted. */
  kun?: string[];
};

type PanelProps = {
  kanji: string;
  grade?: number;
  summary?: KanjiDetailSummary;
  /** Extra pills or rows a surface wants beneath the drawing. */
  detail?: ReactNode;
  /** Omitted on the standalone page, which has nothing to close. */
  onClose?: () => void;
  /** The address this character can be shared at. */
  shareHref?: string;
};

type Props = PanelProps & { onClose: () => void };

/**
 * The character as a font draws it.
 *
 * Both faces, because they differ where it matters for handwriting: Mincho
 * keeps the tapered strokes and triangular stops a textbook shows, while Gothic
 * renders every stroke at one weight. A child copying strokes is copying the
 * Mincho shape.
 */
function PrintedGlyph({ kanji, label, fontFamily }: { kanji: string; label: string; fontFamily: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        translate="no"
        style={{ fontFamily }}
        className={noTranslateClass(
          "flex h-16 w-16 items-center justify-center rounded-2xl border border-kanji/40 bg-kanji/5 text-4xl font-black leading-none text-kanji",
        )}
        aria-hidden="true"
      >
        {kanji}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/40">{label}</span>
    </div>
  );
}

/**
 * Copies the character's own address.
 *
 * Copy rather than a share sheet: this is used on a desktop as often as a
 * phone, and a link on the clipboard works in every place someone might paste
 * it. Falls back to selecting the text when the clipboard is unavailable.
 */
function ShareLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        const url = typeof window === "undefined" ? href : new URL(href, window.location.origin).toString();
        void navigator.clipboard?.writeText(url).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          },
          () => {},
        );
      }}
      className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60 transition hover:bg-surface-muted hover:text-foreground"
    >
      {copied ? STROKE_ANIMATION_COPY.linkCopied : STROKE_ANIMATION_COPY.copyLink}
    </button>
  );
}

/** One line carrying whatever the surface knows: readings first, then meaning. */
function summaryLine(summary: KanjiDetailSummary | undefined): string | null {
  if (!summary) return null;

  const readings = [...(summary.on ?? []), ...(summary.kun ?? [])].filter(Boolean);
  const parts = [readings.join("、"), summary.meaning?.trim()].filter(
    (part): part is string => Boolean(part && part.length > 0),
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * One kanji, in detail, openable from any surface.
 *
 * The header carries what the character is rather than only its English gloss:
 * a reader recognises 何 by なに before they recognise it by "what". The stroke
 * count sits up here too, since it describes the character rather than the
 * animation.
 *
 * The drawing takes the left and its controls stack down the right at desktop
 * width, so the glyph stays the tallest thing in the panel instead of sitting
 * above a wide row of buttons. The credit is centred at the foot, where it
 * belongs to the whole panel rather than to the animation alone.
 */
/**
 * The panel itself, without a shell.
 *
 * Shared by the modal and by the page a link opens, so a character looks the
 * same however you arrive at it.
 */
export function KanjiDetailPanel({ kanji, grade, summary, detail, onClose, shareHref }: PanelProps) {
  const [meta, setMeta] = useState<StrokeMeta | null>(null);
  const line = summaryLine(summary);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted/60 px-5 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/55">
            {STROKE_ANIMATION_COPY.title}
            {meta ? (
              <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-foreground/60">
                {meta.strokeCount}{" "}
                {meta.strokeCount === 1 ? STROKE_ANIMATION_COPY.stroke : STROKE_ANIMATION_COPY.strokes}
              </span>
            ) : null}
          </p>
          {line ? (
            <p className="truncate text-sm font-bold text-foreground" title={line}>
              <JapaneseInProse text={line} />
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {shareHref ? <ShareLink href={shareHref} /> : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={STROKE_ANIMATION_COPY.close}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-sm font-black text-foreground/70 transition hover:bg-surface-muted"
            >
              X
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-center">
        <div className="flex flex-row gap-3 sm:flex-col">
          <PrintedGlyph kanji={kanji} label={STROKE_ANIMATION_COPY.gothic} fontFamily="var(--font-jp-sans), sans-serif" />
          <PrintedGlyph kanji={kanji} label={STROKE_ANIMATION_COPY.mincho} fontFamily="var(--font-jp-serif), serif" />
        </div>

        <KanjiStrokeAnimation
          key={kanji}
          kanji={kanji}
          grade={grade}
          size={200}
          controlsLayout="column"
          showStrokeCount={false}
          showCredit={false}
          onLoaded={setMeta}
        />
      </div>

      {detail ? <div className="border-t border-line px-5 py-3">{detail}</div> : null}

      {meta ? (
        <p className="border-t border-line px-5 py-2 text-center text-[10px] font-semibold text-foreground/40">
          {STROKE_ANIMATION_COPY.creditPrefix}{" "}
          <a
            href={meta.attribution.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:text-foreground/60"
          >
            {meta.attribution.source}
          </a>{" "}
          <a
            href={meta.attribution.licenceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:text-foreground/60"
          >
            ({meta.attribution.licence})
          </a>
        </p>
      ) : null}
    </>
  );
}

/** The modal form: the same panel inside a dialog shell. */
export default function KanjiDetailModal(props: Props) {
  return (
    <ModalShell
      onClose={props.onClose}
      closeOnBackdrop
      layer={MODAL_LAYERS.strokes}
      label={`${STROKE_ANIMATION_COPY.title} — ${props.kanji}`}
      panelClassName="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
    >
      <KanjiDetailPanel {...props} />
    </ModalShell>
  );
}
