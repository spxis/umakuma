import { isTaggedPracticeSource, type PracticeSource } from "@/lib/practiceSourceKinds";

import { PRACTICE_SHEET_COPY, type SheetSize } from "./practiceCopy";
import ReferenceSheet from "./ReferenceSheet";
import TracingSheet, { type SheetMode, type TraceEntry } from "./TracingSheet";

/**
 * Whichever sheet the mode names, on the surface a sheet sits on.
 *
 * The page had this inline and reached 499 lines doing it, one under the
 * gate. Which sheet gets drawn is its own decision - and now that there are
 * two kinds it is a decision that will grow again - so it lives in its own
 * file rather than as a branch in the middle of a page that is mostly
 * controls.
 */
export default function SheetBody({
  entries,
  source,
  mode,
  showModel,
  showReadings,
  showNumbers,
  size,
  startIndex,
  rowsPerEntry,
}: {
  entries: TraceEntry[];
  source: PracticeSource;
  mode: SheetMode;
  showModel: boolean;
  showReadings: boolean;
  showNumbers: boolean;
  size: SheetSize;
  startIndex: number;
  /** Rows each character gets when the page is filled; unset for a row each. */
  rowsPerEntry?: number;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-line p-4 text-sm">
        {isTaggedPracticeSource(source) ? PRACTICE_SHEET_COPY.emptyTagged : PRACTICE_SHEET_COPY.empty}
      </p>
    );
  }

  return (
    /*
     * The sheet sits on its own surface, the way every other list on the site
     * does. On paper the card is nothing: no border, no radius, no padding -
     * the squares should start at the margin the printer gives them rather
     * than inside a drawn box.
     */
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {mode === "reference" ? (
        <ReferenceSheet
          entries={entries}
          showReadings={showReadings}
          size={size}
          showNumbers={showNumbers}
          startIndex={startIndex}
        />
      ) : (
        <TracingSheet
          entries={entries}
          mode={mode}
          showModel={showModel}
          showReadings={showReadings}
          size={size}
          showNumbers={showNumbers}
          startIndex={startIndex}
          rowsPerEntry={rowsPerEntry}
        />
      )}
    </div>
  );
}
