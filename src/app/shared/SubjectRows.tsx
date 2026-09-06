import { Fragment, type ReactNode } from "react";

import { defaultSubjectColumns, type SubjectColumn } from "@/app/shared/subjectColumns";
import {
  SUBJECT_LIST_DIVIDERS,
  SUBJECT_LIST_SURFACE,
  SUBJECT_ROW_LANES,
  SUBJECT_VIEW_COPY,
  type SubjectListRow,
} from "@/app/shared/subjectListView";
import { READING_KINDS } from "@/lib/domainConstants";
import { formatReading } from "@/lib/readingDisplay";

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
  /**
   * Choosing by the surface's own mechanism, for the explorers.
   *
   * The two explorers run bulk mode themselves, keyed by subject id with their
   * own shift anchor, and cannot express that as a `SubjectSelection` keyed by
   * glyph. Without a way in, their list density had no checkbox at all: bulk
   * mode was on, every card in the grid carried a tick, and a row in the list
   * still opened the review modal when clicked - so a set could be gathered in
   * one density and not the other.
   */
  picking?: {
    active: boolean;
    isChosen: (row: TRow) => boolean;
    onPick: (row: TRow, shiftKey: boolean, index: number) => void;
    /** Everything on this page at once, where the surface can do that. */
    onPickAll?: (chooseAll: boolean) => void;
  };
  /**
   * Which fields this surface shows.
   *
   * Every list here has a different set and always did - the study queue has an
   * SRS stage, the grade explorer has on and kun readings and no SRS at all,
   * the JLPT explorer has a school grade. What went wrong was letting that
   * difference decide the layout too, so five lists grew five sets of row
   * markup and stopped looking like one product. The surface declares its
   * columns; everything around them belongs here.
   *
   * Defaults to the WaniKani subject set, which is what most callers want.
   */
  columns?: Array<SubjectColumn<TRow>>;
  /**
   * Something to open under one row.
   *
   * Both explorers insert a detail panel after the item just clicked. Return
   * null for every row but that one.
   */
  renderAfterRow?: (row: TRow, index: number) => ReactNode;
};


/** The lanes a reading may occupy: one for a word, two for a kanji. */
const READING_LANE_KEYS = ["reading", "kun", "on"];

/**
 * The reading as a phone shows it, under the meaning.
 *
 * Kun then on, in the scripts a dictionary uses, so the one line a narrow
 * screen has room for says everything the two lanes would have. A word has
 * neither kind and keeps its single reading.
 */
function stackedReading(row: SubjectListRow): string {
  const both = [
    ...(row.kunReadings ?? []).map((reading) => formatReading(READING_KINDS.kun, reading)),
    ...(row.onReadings ?? []).map((reading) => formatReading(READING_KINDS.on, reading)),
  ];
  return both.length > 0 ? both.join("、") : (row.reading ?? "");
}

/** Whether the heading's box governs everything, some of it, or nothing yet. */
type ChooseAllState = "all" | "some" | "none";

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
function LaneHeadings<TRow extends SubjectListRow>({ columns, choosing, chooseAll, hasLeading, hasTrailing }: {
  columns: Array<SubjectColumn<TRow>>;
  choosing: boolean;
  /** Null where the surface's own chooser cannot answer for the whole page. */
  chooseAll: { state: ChooseAllState; onChange: () => void } | null;
  hasLeading: boolean;
  hasTrailing: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 hidden items-center gap-2 border-b border-line bg-surface-muted pr-2 md:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {/*
          * The box that takes the lot.
          *
          * The bar above says "All on this page" in words, and the heading is
          * where a reader of a list of checkboxes looks for the one that
          * governs them - the same square, in the same lane, over the column
          * it fills. Half-chosen reads as mixed rather than as either, so the
          * press that follows is always the one the reader expected: something
          * chosen means clear, nothing chosen means take everything.
          */}
        {choosing ? (
          chooseAll ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={chooseAll.state === "all" ? "true" : chooseAll.state === "some" ? "mixed" : "false"}
              aria-label={SUBJECT_VIEW_COPY.chooseAll}
              title={SUBJECT_VIEW_COPY.chooseAll}
              onClick={chooseAll.onChange}
              className={`${SUBJECT_ROW_LANES.pick} inline-flex h-5 items-center justify-center rounded border text-[11px] font-black leading-none transition ${
                chooseAll.state === "none"
                  ? "border-line text-transparent hover:border-accent/60"
                  : "border-accent bg-accent text-white"
              }`}
            >
              {chooseAll.state === "some" ? "–" : "✓"}
            </button>
          ) : (
            <span className={SUBJECT_ROW_LANES.pick} />
          )
        ) : null}
        {hasLeading ? <span className={SUBJECT_ROW_LANES.leading} /> : null}
        {/* The same lane classes the cells use, from the same column objects,
          * so a heading cannot end up a different width from the column under
          * it however unusual a surface's field list is. */}
        {columns.map((column) => (
          <span key={column.key} className={`${column.lane} ${column.headingClassName ?? ""}`}>
            {column.heading}
          </span>
        ))}
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
  picking,
  columns = defaultSubjectColumns<TRow>(),
  renderAfterRow,
}: Props<TRow>) {
  if (rows.length === 0) return null;

  const hasLeading = Boolean(renderLeading);
  const hasTrailing = Boolean(renderTrailing);
  /*
   * The stacked reading is only a stand-in for a reading lane that exists -
   * and there may be two of them now, kun and on, which collapse below `md`
   * exactly as the single lane did.
   */
  const hasReadingLane = columns.some((column) => READING_LANE_KEYS.includes(column.key));
  const order = rows.map((row) => row.glyph);

  /*
   * The two ways of choosing, reduced to one before the rows are drawn.
   *
   * `selection` is the shared glyph-keyed mechanism; `picking` is a surface
   * that runs its own. Below this line the row does not know which it was
   * given, so a checkbox and a picking click cannot appear for one and not the
   * other - which is exactly how the study list ended up with neither.
   */
  const chooser = picking?.active
    ? { isChosen: picking.isChosen, onPick: picking.onPick }
    : selection?.choosing
      ? {
          isChosen: (row: TRow) => selection.chosen.has(row.glyph),
          onPick: (row: TRow, shiftKey: boolean) =>
            shiftKey ? selection.extendTo(row.glyph, order) : selection.toggle(row.glyph),
        }
      : null;
  const choosing = chooser !== null;

  /*
   * Whether the heading's box can answer for the whole page.
   *
   * The shared selection can - it takes a set of keys and clears itself - so
   * every list here gets the box. A surface running its own picking is asked
   * for the same two acts, and gets no box until it offers them, rather than
   * being handed a control that ticks one row at a time.
   */
  const chosenHere = chooser ? rows.filter((row) => chooser.isChosen(row)).length : 0;
  const chooseAllState: ChooseAllState = chosenHere === 0 ? "none" : chosenHere === rows.length ? "all" : "some";
  const chooseAll =
    !chooser
      ? null
      : picking?.active
        ? picking.onPickAll
          ? { state: chooseAllState, onChange: (): void => picking.onPickAll?.(chooseAllState !== "all") }
          : null
        : selection
          ? {
              state: chooseAllState,
              onChange: () => (chooseAllState === "all" ? selection.clear() : selection.addAll(order)),
            }
          : null;

  return (
    <div className={SUBJECT_LIST_SURFACE}>
      <LaneHeadings
        columns={columns}
        choosing={choosing}
        chooseAll={chooseAll}
        hasLeading={hasLeading}
        hasTrailing={hasTrailing}
      />

      {toGroups(rows, groupBy).map((group) => (
        <section key={group.heading || "all"}>
          {groupBy ? (
            /* Under the lane headings rather than over them, so both stay legible. */
            <h3 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-surface-muted px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60 md:top-7">
              <span>{group.heading}</span>
              <span className="font-bold tracking-normal text-foreground/60">{group.rows.length}</span>
            </h3>
          ) : null}

          <ul className={SUBJECT_LIST_DIVIDERS}>
            {group.rows.map(({ row, index }) => {
              const chosen = Boolean(chooser?.isChosen(row));
              const opened = renderAfterRow?.(row, index) ?? null;
              return (
              <Fragment key={row.key}>
              <li
                className={`group flex items-center gap-2 pr-2 transition hover:bg-surface-muted/50 ${
                  chosen ? "bg-accent/10" : ""
                }`}
              >
                <button
                  type="button"
                  aria-label={rowLabel ? rowLabel(row) : undefined}
                  aria-pressed={choosing ? chosen : undefined}
                  onClick={(event) =>
                    chooser ? chooser.onPick(row, event.shiftKey, index) : onSelect(row, index)
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                >
                  {/* Before the leading slot rather than instead of it: in
                    * history the mark says whether the answer was right, which
                    * is exactly what a member is reading when they decide
                    * whether to pick that one. */}
                  {/* A checkbox, the same square the grid's cards carry, so the
                    * two densities read as the same act rather than as a tick
                    * in one and a box in the other. */}
                  {choosing ? (
                    <span
                      aria-hidden="true"
                      className={`${SUBJECT_ROW_LANES.pick} inline-flex h-5 items-center justify-center rounded border text-[11px] font-black leading-none ${
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

                  {/*
                    * The surface's own fields, in the shared lanes.
                    *
                    * Which columns exist is the surface's business - grades
                    * have on and kun and no SRS, the JLPT explorer has a school
                    * grade - and where they sit is not. The meaning lane is the
                    * one that grows, so it is also the one that carries the
                    * phone-only reading and the surface's sub-line.
                    */}
                  {columns.map((column) =>
                    column.key === "meaning" ? (
                      <span key={column.key} className={`${column.lane} flex flex-col`}>
                        {column.render(row)}
                        <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground/60">
                          {/* Only where the reading has no lane of its own.
                            * Both kinds where the row knows both: a phone gets
                            * the same two readings the lanes show, in one line. */}
                          {hasReadingLane ? (
                            <span lang="ja" translate="no" className={`md:hidden ${JP_TEXT_CLASS}`}>
                              {stackedReading(row)}
                            </span>
                          ) : null}
                          {renderSubMeta ? renderSubMeta(row) : null}
                        </span>
                      </span>
                    ) : (
                      <span key={column.key} className={column.lane}>
                        {column.render(row)}
                      </span>
                    ),
                  )}
                </button>

                {hasTrailing ? (
                  <div className={`${SUBJECT_ROW_LANES.trailing} flex items-center justify-end`}>
                    {renderTrailing?.(row)}
                  </div>
                ) : null}
              </li>

              {/*
                * Whatever the surface opens under the row that was clicked.
                *
                * Both explorers insert their detail panel after the item just
                * chosen, and that is the one thing about their lists no column
                * can express - the reason each kept private row markup long
                * after the rest of it had been shared. It stays inside the
                * list so the panel lands where the row is, not after the lot.
                */}
              {opened ? <li className="border-t border-line/50">{opened}</li> : null}
              </Fragment>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
