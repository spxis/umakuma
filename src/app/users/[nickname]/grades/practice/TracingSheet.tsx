import { Fragment } from "react";

import { PRACTICE_SHEET_COPY, SHEET_COLUMNS, TRACE_CELLS_PER_ROW } from "./practiceCopy";

/**
 * Squares left for strokes, once the model has taken the first column.
 *
 * The model is the reader's choice rather than a default we picked: whether
 * seeing the finished character helps or gives the answer away depends on
 * whether they are learning the character or testing themselves on it.
 */
function strokesPerRow(showModel: boolean): number {
  return showModel ? SHEET_COLUMNS - 1 : SHEET_COLUMNS;
}

/** Rows a character needs, so the last one can be padded to a full width. */
function strokeSheetRows(strokeCount: number, showModel: boolean): number {
  return Math.max(1, Math.ceil(strokeCount / strokesPerRow(showModel)));
}

export type TraceEntry = {
  kanji: string;
  meaning: string | null;
  on: string[];
  kun: string[];
  strokes: string[];
  strokeCount: number;
  viewBox: string;
};

export type SheetMode = "trace" | "strokes";

type Props = {
  entries: TraceEntry[];
  mode?: SheetMode;
  /** Whether the finished character takes the first column of each row. */
  showModel?: boolean;
  /** Whether on and kun print beside the meaning. */
  showReadings?: boolean;
};

/**
 * One character drawn from its stroke paths, at a chosen weight.
 *
 * The same paths that animate the character also draw it faintly for tracing,
 * so a practice cell is the real stroke shape rather than a greyed-out font
 * glyph. That matters: a font's outline is filled, and a child tracing it
 * learns the silhouette instead of the strokes.
 */
function TraceGlyph({ entry, tone }: { entry: TraceEntry; tone: "solid" | "ghost" }) {
  return (
    <svg viewBox={entry.viewBox} className="h-full w-full" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={tone === "solid" ? "text-neutral-800" : "text-neutral-300"}
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
function StrokeStepGlyph({ entry, upTo }: { entry: TraceEntry; upTo: number }) {
  return (
    <svg viewBox={entry.viewBox} className="h-full w-full" aria-hidden="true">
      <g fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        {entry.strokes.slice(0, upTo).map((d, index) => (
          <path
            key={index}
            d={d}
            className={index === upTo - 1 ? "text-neutral-800" : "text-neutral-300"}
            stroke="currentColor"
          />
        ))}
      </g>
    </svg>
  );
}

/** A practice square, with the guide lines a Japanese workbook uses. */
function Cell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative aspect-square w-full border border-neutral-300">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full border-l border-dashed border-neutral-200" />
        <div className="absolute left-0 top-1/2 w-full border-t border-dashed border-neutral-200" />
      </div>
      {children}
    </div>
  );
}

/**
 * A tracing sheet, built for paper.
 *
 * Each row gives the character once at full weight to copy from, then faint
 * repeats to trace over, then empty squares to write unaided — which is the
 * progression a Japanese workbook uses.
 */
export default function TracingSheet({ entries, mode = "trace", showModel = true, showReadings = false }: Props) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <section key={entry.kanji} className="break-inside-avoid">
          <div className="mb-1 flex items-baseline gap-2 text-[11px] text-neutral-500">
            {/* The character first: it is what the row is about, and a reader
              * scanning a printed page finds it faster than the English. */}
            <span className="text-base font-black leading-none text-neutral-900">{entry.kanji}</span>
            <span className="font-black text-neutral-700">{entry.meaning ?? ""}</span>
            {showReadings && (entry.on.length > 0 || entry.kun.length > 0) ? (
              <span className="min-w-0 truncate text-neutral-500">
                {[entry.on.join("、"), entry.kun.join("、")].filter(Boolean).join(" · ")}
              </span>
            ) : null}
            <span className="shrink-0">
              {entry.strokeCount} {entry.strokeCount === 1 ? PRACTICE_SHEET_COPY.stroke : PRACTICE_SHEET_COPY.strokes}
            </span>
          </div>

          {mode === "strokes" ? (
            /*
             * A practice-book page rather than a bare chart: every row is a
             * full eight squares, starting with the finished character to work
             * from and padded with empty squares at the end. A character past
             * seven strokes takes another row instead of shrinking the squares
             * to fit, because a square too small to write in is not one.
             *
             * The model is faint, not solid, so it reads as something to aim
             * at rather than the answer already filled in.
             */
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SHEET_COLUMNS}, minmax(0, 1fr))` }}>
              {Array.from({ length: strokeSheetRows(entry.strokeCount, showModel) }, (_, row) => {
                const perRow = strokesPerRow(showModel);
                const firstStroke = row * perRow;
                const strokesHere = Math.min(perRow, entry.strokeCount - firstStroke);

                return (
                  <Fragment key={`row-${row}`}>
                    {showModel ? (
                      <Cell>
                        <TraceGlyph entry={entry} tone="ghost" />
                      </Cell>
                    ) : null}
                    {Array.from({ length: strokesHere }, (_, offset) => {
                      const strokeNumber = firstStroke + offset + 1;
                      return (
                        <Cell key={`step-${strokeNumber}`}>
                          <span className="absolute left-0.5 top-0 z-10 text-[9px] font-black leading-none text-neutral-400">
                            {strokeNumber}
                          </span>
                          <StrokeStepGlyph entry={entry} upTo={strokeNumber} />
                        </Cell>
                      );
                    })}
                    {Array.from({ length: perRow - strokesHere }, (_, blank) => (
                      <Cell key={`blank-${row}-${blank}`} />
                    ))}
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SHEET_COLUMNS}, minmax(0, 1fr))` }}>
              {/*
                * Solid or faint, never absent. The option is about whether the
                * first square is a written example or another one to trace: a
                * solid character cannot be traced over usefully, so turning it
                * off should hand back a fourth tracing square rather than an
                * empty one.
                */}
              <Cell>
                <TraceGlyph entry={entry} tone={showModel ? "solid" : "ghost"} />
              </Cell>
              {Array.from({ length: TRACE_CELLS_PER_ROW }, (_, index) => (
                <Cell key={`ghost-${index}`}>
                  <TraceGlyph entry={entry} tone="ghost" />
                </Cell>
              ))}
              {Array.from({ length: SHEET_COLUMNS - 1 - TRACE_CELLS_PER_ROW }, (_, index) => (
                <Cell key={`blank-${index}`} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
