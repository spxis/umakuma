import type { ReactNode } from "react";

import StudyHistoryAttemptMetaChips from "@/app/shared/StudyHistoryAttemptMetaChips";
import {
  SUBJECT_VIEW_COPY,
  subjectGlyphTone,
  type SubjectListRow,
} from "@/app/shared/subjectListView";
import { JP_TEXT_CLASS } from "./japaneseText";

type Props<TRow extends SubjectListRow> = {
  rows: TRow[];
  onSelect: (row: TRow, index: number) => void;
  /** Fixed lane before the glyph. History puts the correct/wrong mark here. */
  renderLeading?: (row: TRow) => ReactNode;
  /**
   * Sits outside the row button, so an interactive control here is legal and
   * does not swallow the row's own click. The lists put their remove button
   * here; history puts the time, which is not interactive.
   */
  renderTrailing?: (row: TRow) => ReactNode;
  /** Extra detail on the second line, after the reading. */
  renderSubMeta?: (row: TRow) => ReactNode;
  /** Returns the heading a row belongs under. Omit for a flat list. */
  groupBy?: (row: TRow) => string;
};

type Group<TRow> = { heading: string; rows: Array<{ row: TRow; index: number }> };

/** Groups consecutive rows under a heading, preserving the incoming order. */
function toGroups<TRow extends SubjectListRow>(
  rows: TRow[],
  groupBy?: (row: TRow) => string,
): Array<Group<TRow>> {
  if (!groupBy) return [{ heading: "", rows: rows.map((row, index) => ({ row, index })) }];

  const groups: Array<Group<TRow>> = [];
  rows.forEach((row, index) => {
    const heading = groupBy(row);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.rows.push({ row, index });
    else groups.push({ heading, rows: [{ row, index }] });
  });
  return groups;
}

/**
 * One line per subject, for scanning top down.
 *
 * This is the condensed half of the grid/list pair. The grid is for browsing —
 * big glyphs, a few per row; this is for finding, so everything sits in fixed
 * lanes: leading slot, glyph, meaning over reading, chips, trailing slot. A
 * column of results or levels then reads straight down the page instead of
 * making the eye cross the full width of a card for each item.
 *
 * Study history and the tagged lists both render through here. What differs
 * between them is passed in as slots rather than branched on inside, so neither
 * source has to know the other exists.
 */
export default function SubjectRows<TRow extends SubjectListRow>({
  rows,
  onSelect,
  renderLeading,
  renderTrailing,
  renderSubMeta,
  groupBy,
}: Props<TRow>) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {toGroups(rows, groupBy).map((group) => (
        <section key={group.heading || "all"}>
          {groupBy ? (
            <h3 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-surface-muted px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
              <span>{group.heading}</span>
              <span className="font-bold tracking-normal text-foreground/45">{group.rows.length}</span>
            </h3>
          ) : null}

          <ul className="divide-y divide-line/50">
            {group.rows.map(({ row, index }) => (
              <li key={row.key} className="flex items-center gap-2 pr-2 transition hover:bg-surface-muted/50">
                <button
                  type="button"
                  onClick={() => onSelect(row, index)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                >
                  {renderLeading ? renderLeading(row) : null}

                  <span
                    /*
                     * Wide enough for a four-character word. A single-kanji
                     * lane clipped every vocabulary item to its first character
                     * plus an ellipsis, which is the one thing a reader is
                     * scanning for.
                     */
                    className={`w-16 shrink-0 truncate text-center text-2xl font-black leading-none sm:w-24 ${JP_TEXT_CLASS} ${subjectGlyphTone(row.subjectType)}`}
                  >
                    {row.glyph}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold text-foreground sm:text-base">
                      {row.meaning || SUBJECT_VIEW_COPY.noMeaning}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground/55">
                      {row.reading ? <span translate="no" className={JP_TEXT_CLASS}>{row.reading}</span> : null}
                      {renderSubMeta ? renderSubMeta(row) : null}
                    </span>
                  </span>

                  <StudyHistoryAttemptMetaChips
                    subjectType={row.subjectType}
                    wkLevel={row.wkLevel}
                    srsStage={row.srsStage}
                    srsBucket={row.srsBucket}
                    compact
                    className="hidden shrink-0 items-center gap-1 md:flex"
                  />
                </button>

                {renderTrailing ? <div className="shrink-0">{renderTrailing(row)}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
