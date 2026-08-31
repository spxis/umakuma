import type { ReactNode } from "react";

import StudyHistoryAttemptMetaChips from "@/app/shared/StudyHistoryAttemptMetaChips";
import {
  SUBJECT_VIEW_COPY,
  subjectGlyphTone,
  type SubjectListRow,
} from "@/app/shared/subjectListView";
import { JP_TEXT_CLASS } from "./japaneseText";
import type { SubjectSelection } from "./useSubjectSelection";

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
  /**
   * Choosing, when the surface offers it.
   *
   * Given one, a row's click picks instead of opening - the same click, a
   * different verb, which is how every other list here behaves - and shift
   * takes everything between the last pick and this one. Rows are keyed by
   * their glyph, the same key the explorers choose by, so a set gathered from
   * history can go straight to a practice sheet.
   */
  selection?: SubjectSelection;
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
  selection,
}: Props<TRow>) {
  if (rows.length === 0) return null;

  const choosing = Boolean(selection?.choosing);
  const order = rows.map((row) => row.glyph);
  const pick = (row: TRow, shiftKey: boolean) => {
    if (!selection) return;
    if (shiftKey) selection.extendTo(row.glyph, order);
    else selection.toggle(row.glyph);
  };

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
            {group.rows.map(({ row, index }) => {
              const chosen = choosing && Boolean(selection?.chosen.has(row.glyph));
              return (
              <li
                key={row.key}
                className={`flex items-center gap-2 pr-2 transition hover:bg-surface-muted/50 ${
                  chosen ? "bg-accent/10" : ""
                }`}
              >
                <button
                  type="button"
                  aria-pressed={choosing ? chosen : undefined}
                  onClick={(event) => (choosing ? pick(row, event.shiftKey) : onSelect(row, index))}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                >
                  {/* Before the leading slot rather than instead of it: in
                    * history the mark says whether the answer was right, which
                    * is exactly what a member is reading when they decide
                    * whether to pick that one. */}
                  {choosing ? (
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black leading-none ${
                        chosen ? "border-accent bg-accent text-white" : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  ) : null}
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
                      {row.reading ? <span lang="ja" translate="no" className={JP_TEXT_CLASS}>{row.reading}</span> : null}
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
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
