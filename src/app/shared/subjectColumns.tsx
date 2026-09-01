import type { ReactNode } from "react";

import { PillChip } from "@/app/users/[nickname]/shared/StatusSrsChip";
import {
  shortSubjectTypeLabel,
  subjectTypePillClass,
} from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { isSubjectType, SRS_BUCKETS } from "@/lib/domainConstants";

import { JP_TEXT_CLASS } from "./japaneseText";
import { srsBucketBadgeClass, srsBucketLabel } from "./studyHistoryUi";
import {
  SUBJECT_ROW_LANES,
  SUBJECT_VIEW_COPY,
  subjectGlyphTone,
  type SubjectListRow,
} from "./subjectListView";

/**
 * What a list puts in its columns.
 *
 * Every subject list here shows a different set of fields and always did — the
 * study queue has an SRS stage, the grade explorer has on and kun readings and
 * no SRS at all, the JLPT explorer has a school grade. The mistake was letting
 * that difference decide the *layout* too, so each surface grew its own row
 * markup and the five lists ended up looking like five different products.
 *
 * A column is a heading, a lane width and a way to draw one cell. The surface
 * declares which columns it wants; the row component owns everything else —
 * the surface and its hairlines, the aligned lanes, the heading row, the
 * checkbox, the row button, the leading and trailing slots, and what happens
 * on a phone. Different fields, one shape.
 */
export type SubjectColumn<TRow extends SubjectListRow> = {
  /** React key, and the id a surface uses to pick columns out of a set. */
  key: string;
  /** The heading over the lane. Empty for a lane that needs no name. */
  heading: string;
  /** Width and breakpoint classes. Always from `SUBJECT_ROW_LANES`. */
  lane: string;
  render: (row: TRow) => ReactNode;
  /** Right-aligns the heading over a numeric lane, where that reads better. */
  headingClassName?: string;
};

const CHIP_SIZE = "min-h-0 px-1 py-0.5 text-[9px]";
const NEUTRAL_CHIP = "border-line bg-surface text-foreground/80";

/** The glyph, in the colour of its kind. Every list starts with this. */
export function itemColumn<TRow extends SubjectListRow>(): SubjectColumn<TRow> {
  return {
    key: "item",
    heading: SUBJECT_VIEW_COPY.columnItem,
    lane: SUBJECT_ROW_LANES.glyph,
    headingClassName: "text-center",
    render: (row) => (
      <span
        lang="ja"
        translate="no"
        /*
         * Wide enough for a four-character word. A single-kanji lane clipped
         * every vocabulary item to its first character plus an ellipsis, which
         * is the one thing a reader is scanning for.
         */
        className={`block truncate text-center text-2xl font-black leading-none ${JP_TEXT_CLASS} ${subjectGlyphTone(
          row.subjectType,
        )}`}
      >
        {row.glyph}
      </span>
    ),
  };
}

/**
 * The reading, in its own lane from `md` up.
 *
 * Below that it rejoins the meaning underneath: six columns do not fit on a
 * 393px phone, and a truncated reading is worse than a stacked one.
 */
export function readingColumn<TRow extends SubjectListRow>(
  read: (row: TRow) => string | null = (row) => row.reading,
): SubjectColumn<TRow> {
  return {
    key: "reading",
    heading: SUBJECT_VIEW_COPY.columnReading,
    lane: SUBJECT_ROW_LANES.reading,
    render: (row) => (
      <span
        lang="ja"
        translate="no"
        className={`block truncate text-sm font-semibold text-foreground/70 ${JP_TEXT_CLASS}`}
      >
        {read(row)}
      </span>
    ),
  };
}

/**
 * The meaning, and under it whatever the surface wants said next to it.
 *
 * This is the lane that grows, so it is also where the phone-only reading and
 * a surface's own sub-line live. `renderSubMeta` on the row list feeds it.
 */
export function meaningColumn<TRow extends SubjectListRow>(
  read: (row: TRow) => ReactNode = (row) => row.meaning || SUBJECT_VIEW_COPY.noMeaning,
): SubjectColumn<TRow> {
  return {
    key: "meaning",
    heading: SUBJECT_VIEW_COPY.columnMeaning,
    lane: SUBJECT_ROW_LANES.meaning,
    render: (row) => (
      <span className="block truncate text-sm font-bold text-foreground sm:text-base">{read(row)}</span>
    ),
  };
}

/** Radical, kanji or vocabulary, as the explorer's own coloured pill. */
export function typeColumn<TRow extends SubjectListRow>(): SubjectColumn<TRow> {
  return {
    key: "type",
    heading: SUBJECT_VIEW_COPY.columnType,
    lane: SUBJECT_ROW_LANES.type,
    render: (row) => (
      <PillChip
        className={`${
          isSubjectType(row.subjectType) ? subjectTypePillClass(row.subjectType) : NEUTRAL_CHIP
        } ${CHIP_SIZE}`}
      >
        {isSubjectType(row.subjectType) ? shortSubjectTypeLabel(row.subjectType) : row.subjectType.toUpperCase()}
      </PillChip>
    ),
  };
}

/** The WaniKani level, where the surface has one. */
export function levelColumn<TRow extends SubjectListRow>(
  read: (row: TRow) => number | null = (row) => row.wkLevel,
): SubjectColumn<TRow> {
  return {
    key: "level",
    heading: SUBJECT_VIEW_COPY.columnLevel,
    lane: SUBJECT_ROW_LANES.level,
    render: (row) => {
      const level = read(row);
      return (
        <span className="block text-xs font-bold text-foreground/70">
          {level === null ? "" : `L${level}`}
        </span>
      );
    },
  };
}

/**
 * How far along the item is.
 *
 * The stage joined the bucket rather than keeping a chip of its own: "GURU" and
 * "S5" say one thing between them, and two chips for it cost a lane a narrow
 * screen has to find somewhere.
 */
export function srsColumn<TRow extends SubjectListRow>(): SubjectColumn<TRow> {
  return {
    key: "srs",
    heading: SUBJECT_VIEW_COPY.columnSrs,
    lane: SUBJECT_ROW_LANES.srs,
    render: (row) => {
      if (row.srsBucket !== SRS_BUCKETS.unknown) {
        return (
          <PillChip className={`${srsBucketBadgeClass(row.srsBucket)} ${CHIP_SIZE}`}>
            {row.srsStage === null ? srsBucketLabel(row.srsBucket) : `${srsBucketLabel(row.srsBucket)} ${row.srsStage}`}
          </PillChip>
        );
      }
      /* An unknown bucket says nothing, but a stage still does. */
      if (row.srsStage === null) return null;
      return <PillChip className={`${NEUTRAL_CHIP} ${CHIP_SIZE}`}>S{row.srsStage}</PillChip>;
    },
  };
}

/**
 * A lane the surface fills itself, for a field nothing else has.
 *
 * The grade explorer's on and kun readings, the JLPT explorer's school grade,
 * the WaniKani explorer's review timing. Same lane machinery, same heading row,
 * content the shared component has no business knowing about.
 */
export function customColumn<TRow extends SubjectListRow>(
  column: SubjectColumn<TRow>,
): SubjectColumn<TRow> {
  return column;
}

/**
 * What a list of WaniKani subjects shows unless it says otherwise.
 *
 * Study, history, the tagged lists, a saved list and the bulk panel all want
 * exactly this, so they say nothing and get it.
 */
export function defaultSubjectColumns<TRow extends SubjectListRow>(): Array<SubjectColumn<TRow>> {
  return [
    itemColumn<TRow>(),
    readingColumn<TRow>(),
    meaningColumn<TRow>(),
    typeColumn<TRow>(),
    levelColumn<TRow>(),
    srsColumn<TRow>(),
  ];
}
