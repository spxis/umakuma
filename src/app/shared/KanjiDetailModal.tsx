"use client";

import { useState, type ReactNode } from "react";

import KanjiStrokeAnimation, { type StrokeMeta } from "./KanjiStrokeAnimation";
import ModalShell from "./ModalShell";
import SourceCredit from "./SourceCredit";
import { SOURCE_KEYS } from "@/lib/sourceCredits";
import { summaryLine } from "@/lib/kanjiSummaryLine";
import { MODAL_LAYERS } from "./modalLayers";
import { stepStroke } from "@/lib/strokeSteps";
import { STROKE_ANIMATION_COPY, STROKE_SIDE_WIDTH } from "./strokeAnimationCopy";
import { KANJI_FACES, type KanjiFace } from "./kanjiFaces";
import { useStrokeSize } from "./useStrokeSize";
import { strokeIsInCharacter, strokeNumbers } from "./strokeFocus";
import { noTranslateClass } from "./japaneseText";
import JapaneseInProse from "./JapaneseInProse";

import type { KanjiSummary as KanjiDetailSummary } from "@/lib/kanjiSummaryLine";

export type { KanjiSummary as KanjiDetailSummary } from "@/lib/kanjiSummaryLine";

type PanelProps = {
  kanji: string;
  grade?: number;
  summary?: KanjiDetailSummary;
  /** Extra pills or rows a surface wants beneath the drawing. */
  detail?: ReactNode;
  /**
   * A control that belongs in the header's corner, beside the stroke count.
   *
   * The same slot every other block on a subject page keeps its own control
   * in. A link placed under the drawing instead cost the card a whole row to
   * hold one word.
   */
  actions?: ReactNode;
  /** Omitted on the standalone page, which has nothing to close. */
  onClose?: () => void;
  /** The address this character can be shared at. */
  shareHref?: string;
  /**
   * A dialog has less room than a page, so it fixes the drawing size and
   * offers no size control. The page leaves both to the reader.
   */
  compact?: boolean;
  /**
   * Whether the header carries the readings and meaning under its title.
   *
   * This was the only header on a subject page saying two things, and it said
   * them because it used to be the first thing on the page - there was no page
   * header, so the card became one. A page that names the character above the
   * cards turns this off; a card standing on its own, in a modal or at
   * `/kanji/X/stroke`, still needs to say what it is about.
   */
  showSummaryLine?: boolean;
};

type Props = PanelProps & { onClose: () => void };

/**
 * The character as one face draws it.
 *
 * No caption: the name of the face in capitals under each cell drew the eye
 * from the shapes, which are the point. The name is there on hover, and for a
 * screen reader, which has the character itself in the heading.
 */
function PrintedGlyph({ kanji, face }: { kanji: string; face: KanjiFace }) {
  const title = STROKE_ANIMATION_COPY.face(face.label);
  return (
    <span
      lang="ja"
      translate="no"
      title={title}
      aria-label={title}
      style={{ fontFamily: face.fontFamily }}
      className={noTranslateClass(
        "flex h-16 w-16 items-center justify-center rounded-2xl border border-kanji/40 bg-kanji/5 text-4xl font-black leading-none text-kanji",
      )}
    >
      {kanji}
    </span>
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

/**
 * The numbers of a character, to hold one stroke still by.
 *
 * Shut on arrival, and one small control while it is: the panel earns its
 * quiet by showing the drawing and nothing else, and a row of twenty-one
 * numbers on every character would spend that on a thing most readers are not
 * asking for. Numbers rather than a dropdown because the strokes are a short
 * list a reader moves along - 3, then 4, then 5 - and a dropdown makes each
 * step two clicks and hides where you are in it.
 *
 * Previous and next sit either side of them, because moving along that list
 * was the one thing the numbers made hard: every step was a different target,
 * and on a twenty-stroke character they wrap into a block to search. One
 * repeated press walks the whole character now.
 *
 * All of it on one row. The opener and the numbers were stacked, which cost a
 * line of the panel to say nothing.
 */
function StepButton({
  label,
  mark,
  onClick,
}: {
  label: string;
  mark: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-sm font-black leading-none text-foreground/70 transition hover:bg-surface-muted hover:text-foreground"
    >
      <span aria-hidden="true">{mark}</span>
    </button>
  );
}

function StrokePicker({
  count,
  selected,
  onSelect,
}: {
  count: number;
  selected: number | null;
  onSelect: (stroke: number | null) => void;
}) {
  const open = selected !== null;
  const step = (direction: 1 | -1) => onSelect(stepStroke(selected ?? 1, count, direction));

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-surface-muted/40 px-5 py-2">
      <button
        type="button"
        aria-expanded={open}
        /* Opening picks the first stroke, so it opens onto an answer rather than a question. */
        onClick={() => onSelect(open ? null : 1)}
        className={`inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.08em] transition ${
          open
            ? "border-kanji bg-kanji text-white"
            : "border-line bg-surface text-foreground/60 hover:bg-surface-muted hover:text-foreground"
        }`}
      >
        {open ? STROKE_ANIMATION_COPY.pickAll : STROKE_ANIMATION_COPY.pickStroke}
      </button>

      {open ? (
        <div role="group" aria-label={STROKE_ANIMATION_COPY.chooseStroke} className="flex flex-wrap items-center gap-1">
          {/*
            * Both steps together, ahead of the numbers, rather than one at each
            * end of them. A twenty-nine stroke character wraps its numbers over
            * two rows and put the two controls half a panel apart; pressing
            * next repeatedly wants one target that does not move.
            */}
          <StepButton
            label={STROKE_ANIMATION_COPY.previousStroke}
            mark={STROKE_ANIMATION_COPY.previousMark}
            onClick={() => step(-1)}
          />
          <StepButton
            label={STROKE_ANIMATION_COPY.nextStroke}
            mark={STROKE_ANIMATION_COPY.nextMark}
            onClick={() => step(1)}
          />
          {strokeNumbers(count).map((stroke) => (
            <button
              key={stroke}
              type="button"
              aria-pressed={stroke === selected}
              aria-label={STROKE_ANIMATION_COPY.strokeNumber(stroke)}
              onClick={() => onSelect(stroke)}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-black transition ${
                stroke === selected
                  ? "border-kanji bg-kanji text-white"
                  : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
              }`}
            >
              {stroke}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
export function KanjiDetailPanel({
  kanji,
  grade,
  summary,
  detail,
  actions,
  onClose,
  shareHref,
  compact,
  showSummaryLine = true,
}: PanelProps) {
  const [meta, setMeta] = useState<StrokeMeta | null>(null);
  const size = useStrokeSize();
  const line = summaryLine(summary);
  /*
   * The picked stroke is held with the character it was picked on. This panel
   * outlives one character - the explorers open it again on the next kanji
   * without unmounting it - and stroke 12 carried onto a four-stroke character
   * would name nothing and leave the drawing empty.
   */
  const [picked, setPicked] = useState<{ kanji: string; stroke: number | null }>({ kanji, stroke: null });
  const selected =
    picked.kanji === kanji && strokeIsInCharacter(picked.stroke, meta?.strokeCount ?? 0) ? picked.stroke : null;

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted/60 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {STROKE_ANIMATION_COPY.title}
          </p>
          {showSummaryLine && line ? (
            <p className="truncate text-sm font-bold text-foreground" title={line}>
              <JapaneseInProse text={line} />
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {meta ? (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/60">
              {meta.strokeCount}{" "}
              {meta.strokeCount === 1 ? STROKE_ANIMATION_COPY.stroke : STROKE_ANIMATION_COPY.strokes}
            </span>
          ) : null}
          {actions}
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

      {/* Under the header, where there is room for a row of numbers the body has not got. */}
      {meta ? (
        <StrokePicker
          count={meta.strokeCount}
          selected={selected}
          onSelect={(stroke) => setPicked({ kanji, stroke })}
        />
      ) : null}

      <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-center">
        {/*
          * Printed faces beside the drawing, and out of its way at the largest
          * size: somebody who has asked for the character as big as it goes is
          * looking at the strokes, and four printed copies of it are what the
          * width was being spent on.
          */}
        {size === "large" ? null : (
          <div className={`grid grid-cols-2 justify-center gap-3 ${STROKE_SIDE_WIDTH}`}>
            {KANJI_FACES.map((face) => (
              <PrintedGlyph key={face.id} kanji={kanji} face={face} />
            ))}
          </div>
        )}

        <KanjiStrokeAnimation
          key={kanji}
          kanji={kanji}
          grade={grade}
          size={compact ? 200 : undefined}
          controlsLayout="column"
          showStrokeCount={false}
          showCredit={false}
          onLoaded={setMeta}
          selectedStroke={selected}
        />
      </div>

      {detail ? <div className="border-t border-line px-5 py-3">{detail}</div> : null}

      {meta ? (
        <SourceCredit source={SOURCE_KEYS.kanjivg} label={STROKE_ANIMATION_COPY.creditPrefix} />
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
      <KanjiDetailPanel {...props} compact />
    </ModalShell>
  );
}
