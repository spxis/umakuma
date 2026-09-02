"use client";

import { useEffect, useRef, useState } from "react";

import SourceCredit from "./SourceCredit";
import { STROKE_ANIMATION_COPY, STROKE_MS_PER_STROKE } from "./strokeAnimationCopy";

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
  size = 180,
  controlsLayout = "row",
  showStrokeCount = true,
  showCredit = true,
  onLoaded,
}: Props) {
  const [data, setData] = useState<StrokePayload | null>(null);
  const [error, setError] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);
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

  // Restarting means re-running the dash animation from the beginning.
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
        path.style.transition = `stroke-dashoffset ${STROKE_MS_PER_STROKE}ms linear ${index * STROKE_MS_PER_STROKE}ms`;
        path.style.strokeDashoffset = "0";
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [data, playToken]);

  if (error) {
    return <p className="text-xs font-semibold text-foreground/60">{STROKE_ANIMATION_COPY.unavailable}</p>;
  }

  if (!data) {
    return (
      <div
        className="animate-pulse rounded-2xl border border-line bg-surface-muted"
        style={{ width: size, height: size }}
        aria-label={STROKE_ANIMATION_COPY.loading}
      />
    );
  }

  const stacked = controlsLayout === "column";

  return (
    <div className={stacked ? "flex flex-col items-center gap-3 sm:flex-row sm:items-center" : "flex flex-col items-center gap-2"}>
      <svg
        viewBox={data.viewBox}
        width={size}
        height={size}
        role="img"
        aria-label={`${data.kanji} — ${data.strokeCount} ${strokeWord(data.strokeCount)}`}
        className="rounded-2xl border border-line bg-surface"
      >
        {/* The finished character, faint, so a stroke is drawn onto its outline. */}
        <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/10">
          {data.strokes.map((d, index) => (
            <path key={`ghost-${index}`} d={d} />
          ))}
        </g>

        <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="text-kanji">
          {data.strokes.map((d, index) => (
            <path
              key={`stroke-${index}`}
              d={d}
              ref={(element) => {
                pathRefs.current[index] = element;
              }}
            />
          ))}
        </g>

        {showNumbers ? (
          <g className="fill-foreground/70 text-[7px] font-black">
            {data.strokes.map((d, index) => (
              <StrokeNumber key={`number-${index}`} d={d} index={index} />
            ))}
          </g>
        ) : null}
      </svg>

      <div className={stacked ? "flex flex-row items-center gap-1.5 sm:flex-col sm:items-stretch" : "flex items-center gap-1.5"}>
        <button
          type="button"
          onClick={() => setPlayToken((token) => token + 1)}
          className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted"
        >
          {STROKE_ANIMATION_COPY.replay}
        </button>
        <button
          type="button"
          onClick={() => setShowNumbers((shown) => !shown)}
          className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition ${
            showNumbers
              ? "border-kanji bg-kanji text-white"
              : "border-line bg-surface text-foreground/75 hover:bg-surface-muted"
          }`}
        >
          {STROKE_ANIMATION_COPY.numbers}
        </button>
        {showStrokeCount ? (
          <span className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
            {data.strokeCount} {strokeWord(data.strokeCount)}
          </span>
        ) : null}
      </div>

      {showCredit ? (
        <SourceCredit
          credit={data.attribution}
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
