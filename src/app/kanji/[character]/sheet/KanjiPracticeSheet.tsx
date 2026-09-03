import { Fragment } from "react";

import { Cell, StrokeStepGlyph, TraceGlyph } from "@/app/users/[nickname]/practice/sheetCells";
import type { TraceEntry } from "@/app/users/[nickname]/practice/TracingSheet";

import { KANJI_SHEET_COLUMNS, KANJI_SHEET_COPY, KANJI_SHEET_PRACTICE_ROWS } from "./kanjiSheetCopy";

/**
 * One character, its steps, and the rest of the page to practise on.
 *
 * The list sheets print a grid across many characters, a row each. This is the
 * other shape somebody wants: one character taken apart - every stroke its own
 * square, the way a stroke-order chart shows it - and then the page ruled into
 * empty squares until it runs out.
 *
 * The squares are the ones the list sheets use, from `sheetCells`, so a child
 * who has practised on one recognises the other.
 */
export default function KanjiPracticeSheet({ entry }: { entry: TraceEntry }) {
  const steps = Array.from({ length: entry.strokeCount }, (_, index) => index + 1);
  /* The traced build runs on to as many rows as it needs; the last is padded
   * so the model rows below still start at the left edge. */
  const guideRowFill = (KANJI_SHEET_COLUMNS - (entry.strokeCount % KANJI_SHEET_COLUMNS)) % KANJI_SHEET_COLUMNS;
  const grid = { gridTemplateColumns: `repeat(${KANJI_SHEET_COLUMNS}, minmax(0, 1fr))` };

  return (
    <div className="space-y-4">
      <section className="break-inside-avoid space-y-1">
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60 print:text-neutral-500">
          {KANJI_SHEET_COPY.strokeHeading}
        </h2>
        {/*
          * Every stroke gets a square, however many there are: a sheet for a
          * twenty-two stroke character shows all of them rather than the first
          * row, because the steps are the lesson the sheet carries.
          */}
        <div className="grid gap-1" style={grid}>
          <Cell>
            <TraceGlyph entry={entry} tone="solid" />
          </Cell>
          {steps.map((step) => (
            <Cell key={step}>
              <StrokeStepGlyph entry={entry} upTo={step} />
            </Cell>
          ))}
        </div>
      </section>

      <section className="space-y-1">
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60 print:text-neutral-500">
          {KANJI_SHEET_COPY.practiceHeading}
        </h2>
        {/*
          * A workbook leads the hand before it lets go.
          *
          * The first row is the character built stroke by stroke in faint, to
          * trace over - all faint, unlike the chart above, because down here
          * every mark is something to draw and one black stroke among them
          * would be the only one that is not. Then each row opens with the
          * finished character, also faint, so a child copying into the blanks
          * has the shape at the start of the line rather than four inches up
          * the page.
          */}
        <div className="grid gap-1" style={grid}>
          {steps.map((step) => (
            <Cell key={`guide-${step}`}>
              <StrokeStepGlyph entry={entry} upTo={step} tone="ghost" />
            </Cell>
          ))}
          {Array.from({ length: guideRowFill }, (_, index) => (
            <Cell key={`guide-blank-${index}`} />
          ))}

          {Array.from({ length: KANJI_SHEET_PRACTICE_ROWS }, (_, row) => (
            <Fragment key={`row-${row}`}>
              <Cell>
                <TraceGlyph entry={entry} tone="ghost" />
              </Cell>
              {Array.from({ length: KANJI_SHEET_COLUMNS - 1 }, (_, index) => (
                <Cell key={`blank-${row}-${index}`} />
              ))}
            </Fragment>
          ))}
        </div>
      </section>

    </div>
  );
}
