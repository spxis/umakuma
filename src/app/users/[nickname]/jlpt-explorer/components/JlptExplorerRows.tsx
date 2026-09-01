"use client";

import type { ReactNode } from "react";

import SubjectRows from "@/app/shared/SubjectRows";
import { itemColumn, meaningColumn, srsColumn, type SubjectColumn } from "@/app/shared/subjectColumns";
import { JP_TEXT_CLASS, noTranslateClass } from "@/app/shared/japaneseText";
import { SUBJECT_ROW_LANES } from "@/app/shared/subjectListView";
import type { SubjectSelection } from "@/app/shared/useSubjectSelection";

import { ExplorerPill, NeutralPill } from "../../shared/ExplorerPill";
import { jlptLevelPillClass } from "../../level-explorer/lib/levelExplorerDisplay";
import { jlptStatusClass } from "../lib/jlptExplorerContentHelpers";
import type { JlptRow } from "../lib/jlptRowAdapter";
import { JLPT_EXPLORER_TEXT } from "./JlptExplorer.constants";

/**
 * The columns a JLPT list shows.
 *
 * Not the WaniKani set. A JLPT kanji has an N level and a school grade, which
 * nothing else here has, and it has a WaniKani level and an SRS stage only when
 * the member's own account happens to teach it. The lanes, headings, surface
 * and row behaviour are the shared ones; these six fields are this page's.
 *
 * Under peek the reading and the meaning are the answer, so both lanes go
 * blank rather than the row being drawn differently.
 */
export function jlptColumns(studyMode: boolean, showEnglish: boolean): Array<SubjectColumn<JlptRow>> {
  return [
    itemColumn<JlptRow>(),
    {
      /*
       * Always the reading, except in study mode where the whole answer is
       * withheld. On a card these two shared one subtitle, so showing the
       * English meant hiding the reading; two lanes need no such trade.
       */
      key: "reading",
      heading: JLPT_EXPLORER_TEXT.columnReading,
      lane: SUBJECT_ROW_LANES.reading,
      render: (row) => (
        <span
          lang="ja"
          translate="no"
          className={`block truncate text-sm font-semibold text-foreground/70 ${JP_TEXT_CLASS}`}
        >
          {studyMode ? "" : row.reading}
        </span>
      ),
    },
    /* The peek toggle is about the English, so it hides only this one. */
    meaningColumn<JlptRow>((row) =>
      /* The card's placeholder, not the badge: "Hints Hidden" repeated down
       * forty rows says once what the toolbar already says once. */
      studyMode ? <span className="text-foreground/60">…</span> : showEnglish ? row.meaning : "",
    ),
    {
      key: "grade",
      heading: JLPT_EXPLORER_TEXT.columnGrade,
      lane: SUBJECT_ROW_LANES.level,
      render: (row) =>
        typeof row.item.schoolGrade === "number" ? (
          <NeutralPill>G{row.item.schoolGrade}</NeutralPill>
        ) : null,
    },
    {
      key: "jlpt",
      heading: JLPT_EXPLORER_TEXT.columnJlpt,
      lane: SUBJECT_ROW_LANES.level,
      render: (row) => (
        <span translate="no" className={noTranslateClass("")}>
          <ExplorerPill className={jlptLevelPillClass()}>{`N${row.item.nLevel}`}</ExplorerPill>
        </span>
      ),
    },
    {
      /*
       * The member's own progress, which is the point of showing a JLPT list
       * to somebody who has an account at all. "Untracked" is a real answer -
       * this character is not in their WaniKani levels - so it is said rather
       * than left blank.
       */
      key: "status",
      heading: JLPT_EXPLORER_TEXT.columnStatus,
      lane: SUBJECT_ROW_LANES.srs,
      render: (row) => (
        <ExplorerPill className={`text-[9px] ${jlptStatusClass(row.view.userMatch?.status)}`}>
          {row.view.userMatch?.status ?? JLPT_EXPLORER_TEXT.untracked}
        </ExplorerPill>
      ),
    },
    srsColumn<JlptRow>(),
  ];
}

/**
 * The JLPT catalogue as a list.
 *
 * This was private row markup on a card component that also drew the grid, so
 * the JLPT list and the study queue looked like two different products over the
 * same idea. It draws through the shared row list now, with the columns above.
 */
export default function JlptExplorerRows({
  rows,
  studyMode,
  showEnglish,
  selection,
  selectedKanji,
  onSelectKanji,
  renderDetail,
  detailIndex,
}: {
  rows: JlptRow[];
  studyMode: boolean;
  showEnglish: boolean;
  selection: SubjectSelection;
  selectedKanji: string | null;
  onSelectKanji: (kanji: string) => void;
  /** The detail panel, opened under the row that was chosen. */
  renderDetail: () => ReactNode;
  detailIndex: number;
}) {
  return (
    <SubjectRows<JlptRow>
      rows={rows}
      columns={jlptColumns(studyMode, showEnglish)}
      onSelect={(row) => onSelectKanji(row.item.kanji)}
      selection={selection}
      renderLeading={(row) => (
        <span translate="no" className={noTranslateClass("text-[10px] font-semibold text-foreground/60")}>
          {selectedKanji === row.item.kanji ? "▸" : ""}
        </span>
      )}
      renderAfterRow={(_row, index) => (index === detailIndex ? renderDetail() : null)}
    />
  );
}
