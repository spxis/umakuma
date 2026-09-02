import { noTranslateClass } from "@/app/shared/japaneseText";

import { PRACTICE_SHEET_COPY, type SheetSize } from "./practiceCopy";
import type { TraceEntry } from "./TracingSheet";

/**
 * The list itself, printed to read rather than to write on.
 *
 * The tracing sheet answers "give me something to practise on"; this answers
 * the other half of the same request - a copy of the list to keep beside the
 * desk, or hand to somebody, with what each character means and how it is
 * read. It is the same characters in the same order, so a member can print
 * both and have them agree.
 *
 * It is a table because that is what it is: no squares, no ghost glyphs, and
 * the columns line up down the page so the eye can run a single column
 * looking for one character.
 */
export default function ReferenceSheet({
  entries,
  showReadings = true,
  size = "medium",
  showNumbers = true,
  startIndex = 1,
}: {
  entries: TraceEntry[];
  showReadings?: boolean;
  size?: SheetSize;
  showNumbers?: boolean;
  startIndex?: number;
}) {
  /*
   * The size control means the same thing here as on the tracing sheet - how
   * much fits across - but as a minimum column width rather than a count.
   * Three fixed columns on a 393px phone gave each reading about sixty pixels
   * and set it one character per line; with a minimum the row simply becomes
   * one column and stays readable. Paper is wide, so the printed sheet still
   * gets its three.
   */
  const minColumn = size === "large" ? "20rem" : size === "small" ? "11rem" : "15rem";

  return (
    <ul
      className="grid gap-x-6 gap-y-1"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColumn}, 1fr))` }}
    >
      {entries.map((entry, index) => (
        <li
          key={entry.kanji}
          className="flex break-inside-avoid items-baseline gap-2 border-b border-line/60 py-1 print:border-neutral-200"
        >
          {showNumbers ? (
            <span className="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-accent print:text-neutral-400">
              {startIndex + index}
            </span>
          ) : null}
          <span
            lang="ja"
            translate="no"
            className={noTranslateClass("shrink-0 text-2xl font-black leading-none text-foreground print:text-neutral-900")}
          >
            {entry.kanji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black text-foreground/85 print:text-neutral-700">
              {entry.meaning ?? ""}
            </span>
            {showReadings && (entry.on.length > 0 || entry.kun.length > 0) ? (
              <span
                lang="ja"
                translate="no"
                /* Wrapping, not truncating: a reading cut off at the column
                   edge is the one thing this sheet exists to carry. */
                className={noTranslateClass("block text-[11px] leading-snug text-kanji print:text-neutral-500")}
              >
                {[entry.on.join("、"), entry.kun.join("、")].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-[10px] text-foreground/60 print:text-neutral-400">
            {entry.strokeCount} {entry.strokeCount === 1 ? PRACTICE_SHEET_COPY.stroke : PRACTICE_SHEET_COPY.strokes}
          </span>
        </li>
      ))}
    </ul>
  );
}
