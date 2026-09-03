"use client";

import { useEffect, useRef, useState } from "react";

import SourceCredit from "./SourceCredit";
import { SOURCE_KEYS } from "@/lib/sourceCredits";
import { setStrokeSize, useStrokeSize } from "./useStrokeSize";
import { STROKE_FOCUS_CLASS, STROKE_FOCUS_STATES, strokeFocusState } from "./strokeFocus";
import {
  STROKE_ANIMATION_COPY,
  STROKE_MS_PER_STROKE,
  STROKE_SIDE_WIDTH,
  STROKE_NUMBER_PX,
  STROKE_SIZES,
  STROKE_SIZE_VALUES,
  STROKE_VIEWBOX_UNITS,
} from "./strokeAnimationCopy";

type StrokePayload = {
  kanji: string;
  strokes: string[];
  strokeCount: number;
  viewBox: string;
  attribution: { source: string; url: string; licence: string; licenceUrl: string };
};

export type StrokeMeta = {
  strokeCount: number;
  attribution: StrokePayload["attribution"];
};

type Props = {
  kanji: string;
  grade?: number;
  /**
   * The drawing size, when the caller wants to fix it.
   *
   * Left off, the reader chooses from S/M/L and the choice is remembered on
   * that device. A caller that passes one is saying the surface has no room to
   * offer the choice.
   */
  size?: number;
  /**
   * Controls beside the drawing rather than beneath it.
   *
   * At desktop width the glyph is on the left and there is room to stack the
   * controls down the right, which keeps the drawing the tallest thing in the
   * modal instead of a wide block of buttons under it.
   */
  controlsLayout?: "row" | "column";
  /** The modal shows the count in its header and the credit at its foot. */
  showStrokeCount?: boolean;
  showCredit?: boolean;
  /** Hands the count and attribution up, so a caller can place them itself. */
  onLoaded?: (meta: StrokeMeta) => void;
  /**
   * One stroke to hold still, counted from one, or null to play them all.
   *
   * Chosen in the panel above rather than here: the picker needs the stroke
   * count to draw its row of numbers, and the count is only known once this
   * has loaded, so the panel that already receives it through `onLoaded` is
   * the one place both halves are in scope.
   */
  selectedStroke?: number | null;
};

/**
 * A kanji drawn one stroke at a time.
 *
 * KanjiVG stores each stroke as its own path in writing order, so the animation
 * is the real pen movement rather than a picture fading in: each stroke is
 * dashed to its own length and the dash offset walks to zero, which draws it.
 * That is also why it stays sharp at any size and why a child can follow the
 * order rather than only the result.
 */
export default function KanjiStrokeAnimation({
  kanji,
  grade,
  size,
  controlsLayout = "row",
  showStrokeCount = true,
  showCredit = true,
  onLoaded,
  selectedStroke = null,
}: Props) {
  const [data, setData] = useState<StrokePayload | null>(null);
  const [error, setError] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);
  /* The size this device last chose, read the way every other stored preference is. */
  const chosenSize = useStrokeSize();
  const offersSize = size === undefined;
  const drawnSize = size ?? STROKE_SIZES[chosenSize];
  /* The viewBox is 109 units square; this pins a number to STROKE_NUMBER_PX. */
  const numberFontUnits = (STROKE_NUMBER_PX * STROKE_VIEWBOX_UNITS) / drawnSize;
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  /*
   * Held in a ref so a caller passing an inline callback does not re-run the
   * fetch on every render of its parent.
   */
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  /*
   * No reset here: callers mount this per character through a `key`, so a new
   * character is a new component with fresh state. Clearing it synchronously
   * would only cascade an extra render.
   */
  useEffect(() => {
    let cancelled = false;

    const query = typeof grade === "number" ? `?grade=${grade}` : "";
    fetch(`/api/stroke-order/${encodeURIComponent(kanji)}${query}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("no strokes"))))
      .then((payload: StrokePayload) => {
        if (cancelled) return;
        setData(payload);
        // The caller may want the count in a header and the credit at a foot.
        onLoadedRef.current?.({ strokeCount: payload.strokeCount, attribution: payload.attribution });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [kanji, grade]);

  /*
   * Restarting means re-running the dash animation from the beginning, and
   * picking a stroke is a restart of a smaller kind: everything is wound back
   * to undrawn, then the strokes already down are put back instantly and the
   * chosen one is drawn with no queue in front of it, so the pen direction is
   * visible on the stroke you asked about rather than eight strokes later.
   */
  useEffect(() => {
    if (!data) return;
    for (const path of pathRefs.current) {
      if (!path) continue;
      const length = path.getTotalLength();
      path.style.transition = "none";
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
    }

    const frame = requestAnimationFrame(() => {
      pathRefs.current.forEach((path, index) => {
        if (!path) return;
        if (selectedStroke === null) {
          path.style.transition = `stroke-dashoffset ${STROKE_MS_PER_STROKE}ms linear ${index * STROKE_MS_PER_STROKE}ms`;
          path.style.strokeDashoffset = "0";
          return;
        }

        const state = strokeFocusState(index, selectedStroke);
        /* Left wound back, so a stroke not yet reached is not on the page at all. */
        if (state === STROKE_FOCUS_STATES.ahead) return;
        path.style.transition =
          state === STROKE_FOCUS_STATES.current ? `stroke-dashoffset ${STROKE_MS_PER_STROKE}ms linear` : "none";
        path.style.strokeDashoffset = "0";
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [data, playToken, selectedStroke]);

  if (error) {
    return <p className="text-xs font-semibold text-foreground/60">{STROKE_ANIMATION_COPY.unavailable}</p>;
  }

  if (!data) {
    return (
      <div
        className="animate-pulse rounded-2xl border border-line bg-surface-muted"
        style={{ width: drawnSize, height: drawnSize }}
        aria-label={STROKE_ANIMATION_COPY.loading}
      />
    );
  }

  const stacked = controlsLayout === "column";

  return (
    <div className={stacked ? "flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4" : "flex flex-col items-center gap-2"}>
      <svg
        viewBox={data.viewBox}
        width={drawnSize}
        height={drawnSize}
        role="img"
        aria-label={`${data.kanji} — ${data.strokeCount} ${strokeWord(data.strokeCount)}`}
        /* Large is wider than the narrowest phone, so it shrinks to fit rather than overflowing. */
        className="h-auto max-w-full rounded-2xl border border-line bg-surface"
      >
        {/*
          * The finished character, faint, so a stroke is drawn onto its outline
          * - but not while one stroke is being studied, where an outline of
          * everything is what makes "not drawn yet" look drawn.
          */}
        {selectedStroke === null ? (
          <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/10">
            {data.strokes.map((d, index) => (
              <path key={`ghost-${index}`} d={d} />
            ))}
          </g>
        ) : null}

        <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="text-kanji">
          {data.strokes.map((d, index) => (
            <path
              key={`stroke-${index}`}
              d={d}
              /* Nearer than the group's colour, so the three states win while one is picked. */
              className={
                selectedStroke === null ? undefined : STROKE_FOCUS_CLASS[strokeFocusState(index, selectedStroke)]
              }
              ref={(element) => {
                pathRefs.current[index] = element;
              }}
            />
          ))}
        </g>

        {showNumbers ? (
          /*
           * The numbers keep their size while the drawing grows.
           *
           * They are drawn in the viewBox, so a font measured there scaled with
           * the character: Large made every number bigger and left them
           * colliding exactly as before, which is the opposite of what growing
           * the drawing was for. Sized against the drawn width instead, they
           * come out the same height on screen at every setting and the extra
           * room goes where it was wanted - between them.
           */
          <g className="fill-foreground/70 font-black" fontSize={numberFontUnits}>
            {data.strokes.map((d, index) =>
              /* A number is ink too: numbering a stroke that is not drawn yet answers the wrong question. */
              selectedStroke !== null && index + 1 > selectedStroke ? null : (
                <StrokeNumber key={`number-${index}`} d={d} index={index} />
              ),
            )}
          </g>
        ) : null}
      </svg>

      <div
        className={
          stacked
            ? `flex flex-row flex-wrap items-center justify-center gap-1.5 sm:flex-col sm:items-center ${STROKE_SIDE_WIDTH}`
            : "flex items-center gap-1.5"
        }
      >
        <button
          type="button"
          onClick={() => setPlayToken((token) => token + 1)}
          className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted"
        >
          {STROKE_ANIMATION_COPY.replay}
        </button>
        <button
          type="button"
          onClick={() => setShowNumbers((shown) => !shown)}
          className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition ${
            showNumbers
              ? "border-kanji bg-kanji text-white"
              : "border-line bg-surface text-foreground/75 hover:bg-surface-muted"
          }`}
        >
          {STROKE_ANIMATION_COPY.numbers}
        </button>
        {offersSize ? (
          <div
            role="group"
            aria-label={STROKE_ANIMATION_COPY.sizeLabel}
            className="flex items-center justify-center gap-1 rounded-full border border-line bg-surface p-0.5"
          >
            {STROKE_SIZE_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStrokeSize(value);
                }}
                aria-pressed={chosenSize === value}
                title={STROKE_ANIMATION_COPY.sizeTitle[value]}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black uppercase transition ${
                  chosenSize === value ? "bg-kanji text-white" : "text-foreground/60 hover:bg-surface-muted"
                }`}
              >
                {STROKE_ANIMATION_COPY.sizes[value]}
              </button>
            ))}
          </div>
        ) : null}
        {showStrokeCount ? (
          <span className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
            {data.strokeCount} {strokeWord(data.strokeCount)}
          </span>
        ) : null}
      </div>

      {showCredit ? (
        <SourceCredit
          source={SOURCE_KEYS.kanjivg}
          label={STROKE_ANIMATION_COPY.creditPrefix}
          variant="inline"
          className="text-[10px]!"
        />
      ) : null}
    </div>
  );
}

/** 一 has exactly one stroke, so the count needs a singular. */
function strokeWord(count: number): string {
  return count === 1 ? STROKE_ANIMATION_COPY.stroke : STROKE_ANIMATION_COPY.strokes;
}

/** Puts a stroke's number where that stroke starts, which is where the pen lands. */
function StrokeNumber({ d, index }: { d: string; index: number }) {
  const match = /^M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(d);
  if (!match) {
    return null;
  }

  return (
    <text x={Number(match[1]) + 2} y={Number(match[2]) - 1}>
      {index + 1}
    </text>
  );
}
