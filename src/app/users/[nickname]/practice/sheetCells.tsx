import type { ReactNode } from "react";

import type { TraceEntry } from "./TracingSheet";

/**
 * The parts a practice square is made of.
 *
 * Pulled out of the tracing sheet so a page that is not a list of characters
 * can still be one - the single-character sheet draws the same square, the
 * same guide lines and the same stroke steps, and two drawings of a workbook
 * cell would drift the first time one was adjusted.
 */

/*
 * Screen first, paper second.
 *
 * The sheet used to be drawn in greys because it is made to be printed, which
 * made the page itself look like a photocopy of the site rather than part of
 * it. So every ink colour is stated twice: the theme colour a reader sees, and
 * the grey that goes on paper. A workbook's faint guide strokes are printed in
 * pale blue anyway, which is what the accent gives back here.
 */
export const INK_SOLID = "text-foreground print:text-neutral-800";
export const INK_GHOST = "text-accent/25 print:text-neutral-300";

/**
 * One character drawn from its stroke paths, at a chosen weight.
 *
 * The same paths that animate the character also draw it faintly for tracing,
 * so a practice cell is the real stroke shape rather than a greyed-out font
 * glyph. That matters: a font's outline is filled, and a child tracing it
 * learns the silhouette instead of the strokes.
 */
export function TraceGlyph({ entry, tone }: { entry: TraceEntry; tone: "solid" | "ghost" }) {
  return (
    <svg viewBox={entry.viewBox} className="h-full w-full" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={tone === "solid" ? INK_SOLID : INK_GHOST}
      >
        {entry.strokes.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The character as far as one stroke, with that stroke picked out.
 *
 * Cumulative rather than one stroke alone, because that is what a 筆順 chart
 * shows and what the reader needs: a single detached stroke says what to draw
 * but not where on the square to put it. Earlier strokes stay faint so the new
 * one is unmistakable.
 */
export function StrokeStepGlyph({ entry, upTo }: { entry: TraceEntry; upTo: number }) {
  return (
    <svg viewBox={entry.viewBox} className="h-full w-full" aria-hidden="true">
      <g fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        {entry.strokes.slice(0, upTo).map((d, index) => (
          <path
            key={index}
            d={d}
            className={index === upTo - 1 ? INK_SOLID : INK_GHOST}
            stroke="currentColor"
          />
        ))}
      </g>
    </svg>
  );
}

/** A practice square, with the guide lines a Japanese workbook uses. */
export function Cell({ children }: { children?: ReactNode }) {
  return (
    <div className="relative aspect-square w-full border border-line print:border-neutral-300">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full border-l border-dashed border-line/70 print:border-neutral-200" />
        <div className="absolute left-0 top-1/2 w-full border-t border-dashed border-line/70 print:border-neutral-200" />
      </div>
      {children}
    </div>
  );
}
