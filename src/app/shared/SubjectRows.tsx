import type { ReactNode } from "react";

import SubjectMetaLanes from "@/app/shared/SubjectMetaLanes";
import {
  SUBJECT_ROW_LANES,
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
  /** Extra detail under the meaning. History puts the member's name here. */
  renderSubMeta?: (row: TRow) => ReactNode;
  /** Returns the heading a row belongs under. Omit for a flat list. */
  groupBy?: (row: TRow) => string;
  /**
   * The row button's accessible name, where the click does something a reader
   * cannot infer from the glyph. The bulk panel's rows remove what they show,
   * so "水, water" would announce the opposite of what pressing it does.
   */
  rowLabel?: (row: TRow) => string;
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
 * The heading over the lanes.
 *
 * Which lanes exist is a property of the list, not of a row - a surface either
 * passes `renderLeading` or it does not - so the spacers here can be worked out
 * once and are guaranteed to match every row beneath them.
 *
 * Hidden below `md`, where the narrow lanes collapse and a heading reading
 * "Item / Meaning" would name two columns nobody can miss.
 */
function LaneHeadings({ choosing, hasLeading, hasTrailing }: {
  choosing: boolean;
  hasLeading: boolean;
  hasTrailing: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 hidden items-center gap-2 border-b border-line bg-surface-muted pr-2 md:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {choosing ? <span className={SUBJECT_ROW_LANES.pick} /> : null}
        {hasLeading ? <span className={SUBJECT_ROW_LANES.leading} /> : null}
        <span className={`${SUBJECT_ROW_LANES.glyph} text-center`}>{SUBJECT_VIEW_COPY.columnItem}</span>
        <span className={SUBJECT_ROW_LANES.reading}>{SUBJECT_VIEW_COPY.columnReading}</span>
        <span className={SUBJECT_ROW_LANES.meaning}>{SUBJECT_VIEW_COPY.columnMeaning}</span>
        <span className={SUBJECT_ROW_LANES.type}>{SUBJECT_VIEW_COPY.columnType}</span>
        <span className={SUBJECT_ROW_LANES.level}>{SUBJECT_VIEW_COPY.columnLevel}</span>
        <span className={SUBJECT_ROW_LANES.srs}>{SUBJECT_VIEW_COPY.columnSrs}</span>
      </div>
      {hasTrailing ? <span className={SUBJECT_ROW_LANES.trailing} /> : null}
    </div>
  );
}

/**
 * One line per subject, in aligned columns.
 *
 * This is the condensed half of the grid/list pair. The grid is for browsing —
 * big glyphs, a few per row; this is for finding, so it reads as a table:
 * item, reading, meaning, type, level, SRS, each under its own heading. The
 * bulk-selection panel had been drawing exactly that with a private `<table>`
 * while every other list stacked the reading under the meaning, so the one
 * layout worth having was the one nothing could share. The table is gone and
 * its shape is here.
 *
 * On a phone the narrow lanes collapse and the reading returns to its line
 * under the meaning. Six columns do not fit in 393px, and the alternative to
 * stacking is truncating the reading, which is the thing being scanned for.
 *
 * Study history, the study queue and the tagged lists all render through here.
 * What differs between them is passed in as slots rather than branched on
 * inside, so no source has to know the others exist.
 */
export default function SubjectRows<TRow extends SubjectListRow>({
  rows,
  onSelect,
  renderLeading,
  renderTrailing,
  renderSubMeta,
  groupBy,
  rowLabel,
  selection,
}: Props<TRow>) {
  if (rows.length === 0) return null;

  const choosing = Boolean(selection?.choosing);
  const hasLeading = Boolean(renderLeading);
  const hasTrailing = Boolean(renderTrailing);
  const order = rows.map((row) => row.glyph);
  const pick = (row: TRow, shiftKey: boolean) => {
    if (!selection) return;
    if (shiftKey) selection.extendTo(row.glyph, order);
    else selection.toggle(row.glyph);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <LaneHeadings choosing={choosing} hasLeading={hasLeading} hasTrailing={hasTrailing} />

      {toGroups(rows, groupBy).map((group) => (
        <section key={group.heading || "all"}>
          {groupBy ? (
            /* Under the lane headings rather than over them, so both stay legible. */
            <h3 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-surface-muted px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60 md:top-7">
              <span>{group.heading}</span>
              <span className="font-bold tracking-normal text-foreground/60">{group.rows.length}</span>
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
                  aria-label={rowLabel ? rowLabel(row) : undefined}
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
                      className={`${SUBJECT_ROW_LANES.pick} inline-flex h-5 items-center justify-center rounded-full border text-[11px] font-black leading-none ${
                        chosen ? "border-accent bg-accent text-white" : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  ) : null}
                  {hasLeading ? (
                    <span className={`${SUBJECT_ROW_LANES.leading} flex items-center justify-center`}>
                      {renderLeading?.(row)}
                    </span>
                  ) : null}

                  <span
                    /*
                     * Wide enough for a four-character word. A single-kanji
                     * lane clipped every vocabulary item to its first character
                     * plus an ellipsis, which is the one thing a reader is
                     * scanning for.
                     */
                    className={`${SUBJECT_ROW_LANES.glyph} truncate text-center text-2xl font-black leading-none ${JP_TEXT_CLASS} ${subjectGlyphTone(row.subjectType)}`}
                  >
                    {row.glyph}
                  </span>

                  <span
                    lang="ja"
                    translate="no"
                    className={`${SUBJECT_ROW_LANES.reading} truncate text-sm font-semibold text-foreground/70 ${JP_TEXT_CLASS}`}
                  >
                    {row.reading}
                  </span>

                  <span className={`${SUBJECT_ROW_LANES.meaning} flex flex-col`}>
                    <span className="truncate text-sm font-bold text-foreground sm:text-base">
                      {row.meaning || SUBJECT_VIEW_COPY.noMeaning}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground/60">
                      {/* Only where the reading has no lane of its own. */}
                      {row.reading ? (
                        <span lang="ja" translate="no" className={`md:hidden ${JP_TEXT_CLASS}`}>{row.reading}</span>
                      ) : null}
                      {renderSubMeta ? renderSubMeta(row) : null}
                    </span>
                  </span>

                  <SubjectMetaLanes
                    subjectType={row.subjectType}
                    wkLevel={row.wkLevel}
                    srsStage={row.srsStage}
                    srsBucket={row.srsBucket}
                  />
                </button>

                {hasTrailing ? (
                  <div className={`${SUBJECT_ROW_LANES.trailing} flex items-center justify-end`}>
                    {renderTrailing?.(row)}
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
