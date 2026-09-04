import { Fragment } from "react";

import type { KanjiSheetFacts } from "@/lib/kanjiSheetFacts";

import { noTranslateClass } from "@/app/shared/japaneseText";

import { DEFAULT_SHEET_SIZE, PRACTICE_SHEET_COPY, SHEET_SIZES, type SheetSize } from "./practiceCopy";
import { Cell, StrokeStepGlyph, TraceGlyph } from "./sheetCells";
import { sheetFactLabels } from "./sheetFacts";

/**
 * Squares left for strokes, once the model has taken the first column.
 *
 * The model is the reader's choice rather than a default we picked: whether
 * seeing the finished character helps or gives the answer away depends on
 * whether they are learning the character or testing themselves on it.
 */
function strokesPerRow(showModel: boolean, columns: number): number {
  return showModel ? columns - 1 : columns;
}

/** Rows a character needs, so the last one can be padded to a full width. */
function strokeSheetRows(strokeCount: number, showModel: boolean, columns: number): number {
  return Math.max(1, Math.ceil(strokeCount / strokesPerRow(showModel, columns)));
}

export type TraceEntry = {
  kanji: string;
  meaning: string | null;
  on: string[];
  kun: string[];
  strokes: string[];
  strokeCount: number;
  viewBox: string;
  /** Grade, JLPT and WaniKani, where each is known. */
  facts?: KanjiSheetFacts;
};

/**
 * What the sheet is for.
 *
 * `trace` and `strokes` are both sheets to write on; `reference` is the list
 * printed to read, which is the other half of what somebody printing a list
 * wants and the one the tracing sheet cannot be talked into being.
 */
export type SheetMode = "trace" | "strokes" | "reference";

type Props = {
  entries: TraceEntry[];
  mode?: SheetMode;
  /** Whether the finished character takes the first column of each row. */
  showModel?: boolean;
  /** Whether on and kun print beside the meaning. */
  showReadings?: boolean;
  /** How big each square is, expressed as how many fit across. */
  size?: SheetSize;
  /** Whether each row is numbered with its place in the list. */
  showNumbers?: boolean;
  /**
   * What the first row's number is. The count is the character's place in the
   * whole list, not on this page: row 1 of page two is number 23, and being
   * told it is number 1 for the second time is worse than no number at all.
   */
  startIndex?: number;
  /**
   * How many rows each character gets, when the page is being filled.
   *
   * A list gives each character one row and moves on. A single character
   * wants the opposite - itself, then the rest of the page to work at it - and
   * this is the same sheet doing that: whatever rows the character needs of
   * its own (one to trace, or its stroke chart) come first, and rows to trace
   * and write in top the share up. Left unset, a row each, as a list prints.
   */
  rowsPerEntry?: number;
};

/**
 * The row a workbook uses: the character once to copy from, faint repeats to
 * trace over, then empty squares to write unaided. The same row whether it is
 * a list character's only row or one of the many a filled page gives it.
 */
function TraceRow({
  entry,
  showModel,
  columns,
  traceCells,
}: {
  entry: TraceEntry;
  showModel: boolean;
  columns: number;
  traceCells: number;
}) {
  return (
    <>
      {/*
        * Solid or faint, never absent. The option is about whether the first
        * square is a written example or another one to trace: a solid
        * character cannot be traced over usefully, so turning it off should
        * hand back a fourth tracing square rather than an empty one.
        */}
      <Cell>
        <TraceGlyph entry={entry} tone={showModel ? "solid" : "ghost"} />
      </Cell>
      {Array.from({ length: traceCells }, (_, index) => (
        <Cell key={`ghost-${index}`}>
          <TraceGlyph entry={entry} tone="ghost" />
        </Cell>
      ))}
      {Array.from({ length: columns - 1 - traceCells }, (_, index) => (
        <Cell key={`blank-${index}`} />
      ))}
    </>
  );
}

/**
 * A tracing sheet, built for paper.
 *
 * Each row gives the character once at full weight to copy from, then faint
 * repeats to trace over, then empty squares to write unaided — which is the
 * progression a Japanese workbook uses.
 */
export default function TracingSheet({
  entries,
  mode = "trace",
  showModel = true,
  showReadings = false,
  size = DEFAULT_SHEET_SIZE,
  showNumbers = true,
  startIndex = 1,
  rowsPerEntry,
}: Props) {
  const { columns, traceCells } = SHEET_SIZES[size];
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  /* The rows a character gets beyond its own, when the page is being filled. */
  const extraRows = (own: number) => (rowsPerEntry === undefined ? 0 : Math.max(0, rowsPerEntry - own));

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <section key={entry.kanji} className="break-inside-avoid">
          <div className="mb-1 flex items-baseline gap-2 text-[11px] text-foreground/60 print:text-neutral-500">
            {/*
              * A fixed width and lining figures, so the numbers form a straight
              * column down the margin however many digits they run to. It sits
              * beside the header rather than left of the grid because the grid
              * divides the printable width between the squares - a gutter
              * there would come out of every square on the sheet.
              */}
            {showNumbers ? (
              <span className="w-7 shrink-0 text-right font-bold tabular-nums text-accent print:text-neutral-400">
                {startIndex + index}
              </span>
            ) : null}
            {/* The character first: it is what the row is about, and a reader
              * scanning a printed page finds it faster than the English. */}
            <span
              lang="ja"
              translate="no"
              className={noTranslateClass("text-base font-black leading-none text-foreground print:text-neutral-900")}
            >
              {entry.kanji}
            </span>
            <span className="font-black text-foreground/85 print:text-neutral-700">{entry.meaning ?? ""}</span>
            {/*
              * What else is known, in the space the line already had. A student
              * looking at a sheet wants to know where the character sits - the
              * school year it is taught in, the test that asks for it, the
              * WaniKani level that teaches it - and the row was mostly white
              * paper after the meaning. Only what is known is printed, so a
              * character none of the three has stays a short line.
              */}
            {sheetFactLabels(entry.facts).map((label) => (
              <span
                key={label}
                className="shrink-0 rounded-full border border-line px-1.5 text-[10px] font-bold text-foreground/70 print:border-neutral-300 print:text-neutral-500"
              >
                {label}
              </span>
            ))}
            {showReadings && (entry.on.length > 0 || entry.kun.length > 0) ? (
              <span
                lang="ja"
                translate="no"
                className={noTranslateClass("min-w-0 truncate text-kanji print:text-neutral-500")}
              >
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
             * The model is solid, the same as the one heading every practice
             * row below it. It was faint here on the reasoning that a chart
             * row is something to aim at - but the two sit in one column down
             * a single page, so the reasoning showed up as the same character
             * printed two weights, and the eye reads that as a mistake rather
             * than as a distinction.
             */
            <div className="grid gap-1" style={grid}>
              {Array.from({ length: strokeSheetRows(entry.strokeCount, showModel, columns) }, (_, row) => {
                const perRow = strokesPerRow(showModel, columns);
                const firstStroke = row * perRow;
                const strokesHere = Math.min(perRow, entry.strokeCount - firstStroke);

                return (
                  <Fragment key={`row-${row}`}>
                    {showModel ? (
                      <Cell>
                        <TraceGlyph entry={entry} tone="solid" />
                      </Cell>
                    ) : null}
                    {Array.from({ length: strokesHere }, (_, offset) => {
                      const strokeNumber = firstStroke + offset + 1;
                      return (
                        <Cell key={`step-${strokeNumber}`}>
                          <span className="absolute left-0.5 top-0 z-10 text-[9px] font-black leading-none text-accent/70 print:text-neutral-400">
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
              {/* Then the practice, when the page is being filled: the chart is the lesson, these are the work. */}
              {Array.from({ length: extraRows(strokeSheetRows(entry.strokeCount, showModel, columns)) }, (_, row) => (
                <Fragment key={`practice-${row}`}>
                  <TraceRow entry={entry} showModel={showModel} columns={columns} traceCells={traceCells} />
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="grid gap-1" style={grid}>
              {Array.from({ length: 1 + extraRows(1) }, (_, row) => (
                <Fragment key={`row-${row}`}>
                  <TraceRow entry={entry} showModel={showModel} columns={columns} traceCells={traceCells} />
                </Fragment>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
