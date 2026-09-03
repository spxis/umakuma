"use client";


import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import KanjiDetailModal from "@/app/shared/KanjiDetailModal";
import StrokeOrderButton from "@/app/shared/StrokeOrderButton";
import ReadingsLine from "@/app/shared/ReadingsLine";
import { SUBJECT_VIEW_MODES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { READING_KIND_DISPLAY, READING_KINDS, type ReadingKind } from "@/lib/domainConstants";
import { useState, type ReactNode } from "react";

import GradeKanjiRows from "./GradeKanjiRows";
import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import { displayReading, readingsForGrade } from "./gradeExplorerView";
import { noTranslateClass } from "@/app/shared/japaneseText";
import type { SubjectSelection } from "@/app/shared/useSubjectSelection";
import SubjectCards from "@/app/shared/SubjectCards";
import { SUBJECT_TYPES, srsBucketFromStage } from "@/lib/domainConstants";

type Props = {
  items: SchoolGradeKanjiEntry[];
  /** Where a card links, so the grid does not need to know the route. */
  hrefFor?: (entry: SchoolGradeKanjiEntry) => string | null;
  /** Quiz mode: readings stay hidden until a card is selected. */
  hideReadings?: boolean;
  /** Cards for browsing, rows for scanning a long grade at a glance. */
  viewMode?: SubjectViewMode;
  revealedKanji?: Set<string>;
  /** Choosing, handed straight to the shared grid. */
  selection?: SubjectSelection;
  onReveal?: (kanji: string) => void;
  /*
   * Choosing mode. Given both, a card's click picks the character instead of
   * opening its details - the same click, a different verb - so the grid needs
   * no second target and no permanent checkbox.
   */
  chosenKanji?: ReadonlySet<string>;
  /**
   * `extend` is Shift being held: choose everything between the last card and
   * this one, rather than this one alone.
   */
  onChoose?: (kanji: string, extend: boolean) => void;
  /**
   * The filing marks, when the board is showing them.
   *
   * Passed in rather than built here: the board owns whether they are open and
   * whose lists they file onto, and the grid only knows where they go - beside
   * a row, or under a card.
   */
  renderFilingTrailing?: (entry: SchoolGradeKanjiEntry) => ReactNode;
  renderFilingUnder?: (entry: SchoolGradeKanjiEntry) => ReactNode;
};

/*
 * `min-w-0` on the row itself, not only on the text inside it.
 *
 * A flex item's floor is the width of its content, so this paragraph sat at
 * whatever the readings measured and the truncation inside it never had a
 * narrower box to truncate to. 下 has eight kun readings and they ran straight
 * out through the right-hand edge of the card.
 */
function ReadingRow({ kind, readings }: { kind: ReadingKind; readings: string[] }) {
  if (readings.length === 0) {
    return (
      <p className="flex items-baseline gap-1.5 text-xs">
        <span className="font-black uppercase tracking-[0.08em] text-foreground/60">{READING_KIND_DISPLAY[kind].label}</span>
        <span className="font-bold text-foreground/60">{GRADE_EXPLORER_COPY.noReadings}</span>
      </p>
    );
  }
  return <ReadingsLine kind={kind} readings={readings} layout="inline" showRomaji={false} />;
}

/**
 * The grade catalogue as cards, readings first.
 *
 * Deliberately not the shared subject card: that one carries an SRS stage and a
 * WaniKani level, neither of which a school grade has, and it shows no readings
 * at all. A grade test asks for the on and kun readings, so those get the room.
 */
export default function GradeKanjiGrid({
  items,
  hrefFor,
  hideReadings = false,
  viewMode = SUBJECT_VIEW_MODES.grid,
  revealedKanji,
  selection,
  onReveal,
  chosenKanji,
  onChoose,
  renderFilingTrailing,
  renderFilingUnder,
}: Props) {
  const rows = viewMode === SUBJECT_VIEW_MODES.list;
  /*
   * Selecting a kanji opens its detail, the way every other subject grid
   * behaves. This one only ever navigated or revealed a quiz answer, so a
   * character here was the one you could not look at closely.
   */
  const [openKanji, setOpenKanji] = useState<SchoolGradeKanjiEntry | null>(null);
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-foreground/70">
        {GRADE_EXPLORER_COPY.noMatches}
      </p>
    );
  }

  /*
   * The list is the shared component, with this page's own columns.
   *
   * It used to be private row markup here, because the shared row list only
   * knew how to draw WaniKani subjects and a grade entry is not one. The list
   * takes its columns from the surface now, so what differs between this and
   * the study queue is six column definitions rather than a second
   * implementation of rows, hairlines, headings, checkboxes and the phone
   * layout.
   */
  if (rows) {
    return (
      <>
        <GradeKanjiRows
          items={items}
          hideReadings={hideReadings}
          revealedKanji={revealedKanji}
          chosenKanji={chosenKanji}
          onChoose={onChoose}
          onSelect={(entry) => {
            if (onReveal) {
              onReveal(entry.kanji);
              return;
            }
            const href = hrefFor?.(entry) ?? null;
            if (href) {
              window.location.assign(href);
              return;
            }
            setOpenKanji(entry);
          }}
          renderTrailing={(row) => (
            <span className="flex flex-wrap items-center justify-end gap-1.5">
            {renderFilingTrailing?.(row.entry)}
            <StrokeOrderButton
              kanji={row.entry.kanji}
              grade={row.entry.grade}
              meaning={row.entry.primaryMeaning ?? null}
              summary={{
                meaning: row.entry.primaryMeaning ?? null,
                on: readingsForGrade(row.entry).on.map(displayReading),
                kun: readingsForGrade(row.entry).kun.map(displayReading),
              }}
              shareHref={`/kanji/${encodeURIComponent(row.entry.kanji)}`}
            />
            </span>
          )}
        />
        {openKanji ? (
          <KanjiDetailModal
            kanji={openKanji.kanji}
            grade={openKanji.grade}
            shareHref={`/kanji/${encodeURIComponent(openKanji.kanji)}`}
            summary={{
              meaning: openKanji.primaryMeaning ?? null,
              on: readingsForGrade(openKanji).on.map(displayReading),
              kun: readingsForGrade(openKanji).kun.map(displayReading),
            }}
            onClose={() => setOpenKanji(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <SubjectCards
        rows={items.map((entry) => ({
          key: entry.kanji,
          subjectId: 0,
          subjectType: SUBJECT_TYPES.kanji,
          glyph: entry.kanji,
          meaning: entry.primaryMeaning ?? GRADE_EXPLORER_COPY.noReadings,
          reading: null,
          wkLevel: null,
          srsStage: null,
          srsBucket: srsBucketFromStage(null),
          entry,
        }))}
        gridClassName="gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]"
        selection={selection}
        /*
         * A hidden card has nowhere to go: the click reveals the answer
         * instead, which is the whole of quiz mode. Once revealed - or when the
         * quiz is off - it is a link to the character's page again.
         */
        hrefFor={(row) =>
          hideReadings && !revealedKanji?.has(row.glyph) ? null : (hrefFor?.(row.entry) ?? null)
        }
        onSelect={(row) => {
          if (hideReadings && !revealedKanji?.has(row.glyph)) {
            onReveal?.(row.glyph);
            return;
          }
          setOpenKanji(row.entry);
        }}
        renderDetail={(row) => {
          const readings = readingsForGrade(row.entry);
          if (hideReadings && !revealedKanji?.has(row.glyph)) {
            return (
              <span className="py-1 text-xs font-bold uppercase tracking-[0.08em] text-foreground/60">
                {GRADE_EXPLORER_COPY.quizTapToReveal}
              </span>
            );
          }
          return (
            <span className="block space-y-0.5">
              <ReadingRow kind={READING_KINDS.on} readings={readings.on} />
              <ReadingRow kind={READING_KINDS.kun} readings={readings.kun} />
            </span>
          );
        }}
        renderPills={(row) => (
          <>
            {typeof row.entry.strokeCount === "number" ? (
              <span className="subject-pill border-line bg-surface text-foreground">
                {row.entry.strokeCount} {GRADE_EXPLORER_COPY.strokes}
              </span>
            ) : null}
            {typeof row.entry.crossRef?.jlptLevel === "number" ? (
              <span translate="no" className={noTranslateClass("subject-pill border-emerald-300 bg-emerald-50 text-emerald-700")}>
                {`${GRADE_EXPLORER_COPY.jlptCrossRef} N${row.entry.crossRef.jlptLevel}`}
              </span>
            ) : null}
          </>
        )}
        renderUnder={renderFilingUnder ? (row) => renderFilingUnder(row.entry) : undefined}
        /* Corner on hover, as before: a control on every card of a screenful is noise. */
        renderCorner={
          selection?.choosing
            ? undefined
            : (row) => (
                <StrokeOrderButton
                  kanji={row.glyph}
                  grade={row.entry.grade}
                  meaning={row.entry.primaryMeaning ?? null}
                  summary={{
                    meaning: row.entry.primaryMeaning ?? null,
                    on: readingsForGrade(row.entry).on.map(displayReading),
                    kun: readingsForGrade(row.entry).kun.map(displayReading),
                  }}
                  shareHref={`/kanji/${encodeURIComponent(row.glyph)}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                />
              )
        }
      />

      {openKanji ? (
        <KanjiDetailModal
          kanji={openKanji.kanji}
          grade={openKanji.grade}
          shareHref={`/kanji/${encodeURIComponent(openKanji.kanji)}`}
          summary={{
            meaning: openKanji.primaryMeaning ?? null,
            on: readingsForGrade(openKanji).on.map(displayReading),
            kun: readingsForGrade(openKanji).kun.map(displayReading),
          }}
          onClose={() => setOpenKanji(null)}
        />
      ) : null}
    </>
  );
}
