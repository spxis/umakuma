"use client";

import SubjectRows from "@/app/shared/SubjectRows";
import { itemColumn, meaningColumn, type SubjectColumn } from "@/app/shared/subjectColumns";
import { JP_TEXT_CLASS, noTranslateClass } from "@/app/shared/japaneseText";
import { SUBJECT_ROW_LANES, type SubjectListRow } from "@/app/shared/subjectListView";
import { SUBJECT_TYPES, SRS_BUCKETS } from "@/lib/domainConstants";
import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import { displayReading, readingsForGrade } from "./gradeExplorerView";

/** A grade row is a kanji plus the catalogue entry it came from. */
export type GradeRow = SubjectListRow & { entry: SchoolGradeKanjiEntry };

/**
 * A school-grade kanji as the shared row list wants it.
 *
 * A grade entry has no subject id, no SRS stage and no WaniKani level - it is
 * not a WaniKani subject at all - so those come through empty and the columns
 * this surface declares never ask for them.
 */
export function toGradeRow(entry: SchoolGradeKanjiEntry): GradeRow {
  return {
    key: entry.kanji,
    subjectId: 0,
    subjectType: SUBJECT_TYPES.kanji,
    glyph: entry.kanji,
    meaning: entry.primaryMeaning ?? "",
    reading: null,
    wkLevel: null,
    srsStage: null,
    srsBucket: SRS_BUCKETS.unknown,
    entry,
  };
}

/** On or kun, in the lane the shared reading column would otherwise occupy. */
function readingLane(readings: string[], hidden: boolean) {
  return (
    <span
      lang="ja"
      translate="no"
      className={`block truncate text-sm font-bold text-foreground/80 ${JP_TEXT_CLASS}`}
    >
      {hidden ? "" : readings.length > 0 ? readings.map(displayReading).join("、") : GRADE_EXPLORER_COPY.noReadings}
    </span>
  );
}

/**
 * The columns a grade list shows.
 *
 * Not the WaniKani set, and never was: a grade has no SRS stage and no level,
 * and what a grade test actually asks for is the on and kun readings, so those
 * get two lanes of their own where the WaniKani lists put type and level. The
 * lane widths, the headings, the surface and the row behaviour are the shared
 * ones - only the fields differ, which is the whole point of declaring them.
 */
export function gradeColumns(hideReadings: boolean, revealed?: Set<string>): Array<SubjectColumn<GradeRow>> {
  const hiddenFor = (row: GradeRow) => hideReadings && !revealed?.has(row.entry.kanji);

  return [
    itemColumn<GradeRow>(),
    meaningColumn<GradeRow>((row) => row.meaning || GRADE_EXPLORER_COPY.noReadings),
    {
      key: "on",
      heading: GRADE_EXPLORER_COPY.onReadings,
      lane: SUBJECT_ROW_LANES.reading,
      render: (row) => readingLane(readingsForGrade(row.entry).on, hiddenFor(row)),
    },
    {
      key: "kun",
      heading: GRADE_EXPLORER_COPY.kunReadings,
      lane: SUBJECT_ROW_LANES.reading,
      render: (row) => readingLane(readingsForGrade(row.entry).kun, hiddenFor(row)),
    },
    {
      /* The `type` lane, not the `level` one: "Strokes" does not fit in 40px,
       * and a heading that overruns its lane lands on the next column's. */
      key: "strokes",
      heading: GRADE_EXPLORER_COPY.strokes,
      lane: SUBJECT_ROW_LANES.type,
      render: (row) => (
        <span className="block text-xs font-bold text-foreground/70">
          {typeof row.entry.strokeCount === "number" ? row.entry.strokeCount : ""}
        </span>
      ),
    },
    {
      key: "jlpt",
      heading: GRADE_EXPLORER_COPY.jlptCrossRef,
      lane: SUBJECT_ROW_LANES.type,
      render: (row) =>
        typeof row.entry.crossRef?.jlptLevel === "number" ? (
          <span
            translate="no"
            className={noTranslateClass(
              "subject-pill border-emerald-300 bg-emerald-50 text-emerald-700",
            )}
          >
            {`N${row.entry.crossRef.jlptLevel}`}
          </span>
        ) : null,
    },
  ];
}

/**
 * The grade catalogue as a list.
 *
 * This used to be private row markup inside `GradeKanjiGrid`, because the
 * shared row list only knew how to draw WaniKani subjects. It draws whatever
 * columns it is handed now, so the difference between this list and the study
 * queue is six column definitions rather than a second implementation of rows,
 * hairlines, headings, checkboxes and the phone layout.
 */
export default function GradeKanjiRows({
  items,
  hideReadings,
  revealedKanji,
  chosenKanji,
  onChoose,
  onSelect,
  renderTrailing,
}: {
  items: SchoolGradeKanjiEntry[];
  hideReadings: boolean;
  revealedKanji?: Set<string>;
  chosenKanji?: ReadonlySet<string>;
  onChoose?: (kanji: string, extend: boolean) => void;
  onSelect: (entry: SchoolGradeKanjiEntry) => void;
  renderTrailing?: (row: GradeRow) => React.ReactNode;
}) {
  return (
    <SubjectRows<GradeRow>
      rows={items.map(toGradeRow)}
      columns={gradeColumns(hideReadings, revealedKanji)}
      onSelect={(row) => onSelect(row.entry)}
      renderTrailing={renderTrailing}
      /*
       * The phone's version of the on and kun lanes.
       *
       * Those two lanes appear at `md` and above, like every narrow lane here,
       * so without this a grade list on a 393px screen was a column of glyphs
       * and meanings with the readings - the thing a grade test actually asks
       * for - nowhere on it.
       */
      renderSubMeta={(row) => {
        if (hideReadings && !revealedKanji?.has(row.entry.kanji)) {
          return <span className="md:hidden">{GRADE_EXPLORER_COPY.quizTapToReveal}</span>;
        }
        const readings = readingsForGrade(row.entry);
        const both = [...readings.on, ...readings.kun].map(displayReading);
        if (both.length === 0) return null;
        return (
          <span lang="ja" translate="no" className={`truncate md:hidden ${JP_TEXT_CLASS}`}>
            {both.join("、")}
          </span>
        );
      }}
      /* The grade explorer chooses by character, with its own shift anchor. */
      picking={{
        active: Boolean(onChoose),
        isChosen: (row) => Boolean(chosenKanji?.has(row.entry.kanji)),
        onPick: (row, shiftKey) => onChoose?.(row.entry.kanji, shiftKey),
      }}
    />
  );
}
