"use client";

import Link from "next/link";

import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import KanjiDetailModal from "@/app/shared/KanjiDetailModal";
import StrokeOrderButton from "@/app/shared/StrokeOrderButton";
import { SUBJECT_VIEW_MODES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { useState } from "react";

import GradeKanjiRows from "./GradeKanjiRows";
import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import { displayReading, readingsForGrade } from "./gradeExplorerView";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { noTranslateClass } from "@/app/shared/japaneseText";

type Props = {
  items: SchoolGradeKanjiEntry[];
  /** Where a card links, so the grid does not need to know the route. */
  hrefFor?: (entry: SchoolGradeKanjiEntry) => string | null;
  /** Quiz mode: readings stay hidden until a card is selected. */
  hideReadings?: boolean;
  /** Cards for browsing, rows for scanning a long grade at a glance. */
  viewMode?: SubjectViewMode;
  revealedKanji?: Set<string>;
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
};

/*
 * `min-w-0` on the row itself, not only on the text inside it.
 *
 * A flex item's floor is the width of its content, so this paragraph sat at
 * whatever the readings measured and the truncation inside it never had a
 * narrower box to truncate to. 下 has eight kun readings and they ran straight
 * out through the right-hand edge of the card.
 */
function ReadingRow({ label, readings }: { label: string; readings: string[] }) {
  return (
    <p className="flex min-w-0 max-w-full items-baseline gap-1.5 text-xs">
      <span className="shrink-0 font-black uppercase tracking-[0.08em] text-foreground/60">{label}</span>
      <span lang="ja" translate="no" className={`min-w-0 truncate font-bold text-foreground/80 ${JP_TEXT_CLASS}`}>
        {readings.length > 0
          ? readings.map(displayReading).join("、")
          : GRADE_EXPLORER_COPY.noReadings}
      </span>
    </p>
  );
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
  onReveal,
  chosenKanji,
  onChoose,
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
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
      {items.map((entry) => {
        const readings = readingsForGrade(entry);
        const href = hrefFor?.(entry) ?? null;
        const hidden = hideReadings && !revealedKanji?.has(entry.kanji);
        const cardBody = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span lang="ja" translate="no" className={`text-4xl font-black leading-none text-kanji ${JP_TEXT_CLASS}`}>
                {entry.kanji}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {typeof entry.strokeCount === "number" ? (
                  <span className="subject-pill border-line bg-surface text-foreground">
                    {entry.strokeCount} {GRADE_EXPLORER_COPY.strokes}
                  </span>
                ) : null}
                {typeof entry.crossRef?.jlptLevel === "number" ? (
                  <span translate="no" className={noTranslateClass("subject-pill border-emerald-300 bg-emerald-50 text-emerald-700")}>
                    {`${GRADE_EXPLORER_COPY.jlptCrossRef} N${entry.crossRef.jlptLevel}`}
                  </span>
                ) : null}
              </span>
            </div>

            <p className="mt-2 truncate text-sm font-black text-foreground" title={entry.primaryMeaning ?? ""}>
              {entry.primaryMeaning ?? GRADE_EXPLORER_COPY.noReadings}
            </p>

            <div className="mt-2 space-y-0.5">
              {hidden ? (
                <p className="py-1 text-xs font-bold uppercase tracking-[0.08em] text-foreground/60">
                  {GRADE_EXPLORER_COPY.quizTapToReveal}
                </p>
              ) : (
                <>
                  <ReadingRow label={GRADE_EXPLORER_COPY.onReadings} readings={readings.on} />
                  <ReadingRow label={GRADE_EXPLORER_COPY.kunReadings} readings={readings.kun} />
                </>
              )}
            </div>
          </>
        );

        const body = cardBody;
        const chosen = Boolean(chosenKanji?.has(entry.kanji));
        const shell = `rounded-2xl border border-kanji/40 bg-kanji/5 p-3 transition${
          chosen ? " ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""
        }`;
        return (
          <li key={entry.kanji} className="group relative min-w-0">
            {/*
              * On a card it stays in the corner - there is room there, and a
              * permanent control on every card of a screenful is noise. A row
              * carries it inline instead, beside the pills, since the row had
              * nowhere to float it that was not already occupied.
              */}
            {onChoose ? null : (
            <StrokeOrderButton
              kanji={entry.kanji}
              grade={entry.grade}
              meaning={entry.primaryMeaning ?? null}
              summary={{
                meaning: entry.primaryMeaning ?? null,
                on: readings.on.map(displayReading),
                kun: readings.kun.map(displayReading),
              }}
              shareHref={`/kanji/${encodeURIComponent(entry.kanji)}`}
              className="absolute bottom-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
            />
            )}
            {/*
              * A tick in the corner while choosing, so a chosen card reads as
              * chosen at a glance rather than only by its ring - which is a
              * fine signal on one card and a hard one to count across forty.
              */}
            {onChoose && chosen ? (
              <span
                aria-hidden="true"
                className="absolute bottom-2 right-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-black text-white"
              >
                ✓
              </span>
            ) : null}
            {onChoose ? (
              <button
                type="button"
                aria-pressed={chosen}
                /*
                 * Shift extends. The same modifier reaches a keyboard user for
                 * free: activating a button with Enter or Space reports the
                 * modifiers held at the time, so Shift+Enter sweeps a range
                 * without a second set of key handlers to keep in step.
                 */
                onClick={(event) => onChoose(entry.kanji, event.shiftKey)}
                className={`block h-full w-full cursor-pointer text-left ${shell} hover:brightness-95`}
              >
                {body}
              </button>
            ) : onReveal ? (
              <button
                type="button"
                onClick={() => onReveal(entry.kanji)}
                className={`block h-full w-full cursor-pointer text-left ${shell} hover:brightness-95`}
              >
                {body}
              </button>
            ) : href ? (
              <Link href={href} className={`block h-full ${shell} hover:brightness-95`}>
                {body}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpenKanji(entry)}
                className={`block h-full w-full cursor-pointer text-left ${shell} hover:brightness-95`}
              >
                {body}
              </button>
            )}
          </li>
        );
      })}
      </ul>

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
