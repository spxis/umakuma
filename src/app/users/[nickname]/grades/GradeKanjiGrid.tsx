"use client";

import Link from "next/link";

import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import KanjiDetailModal from "@/app/shared/KanjiDetailModal";
import StrokeOrderButton from "@/app/shared/StrokeOrderButton";
import { SUBJECT_VIEW_MODES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { useState } from "react";

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
      <span className="shrink-0 font-black uppercase tracking-[0.08em] text-foreground/45">{label}</span>
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

  return (
    <>
      <ul
      className={
        rows
          ? "space-y-1.5"
          : "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]"
      }
    >
      {items.map((entry) => {
        const readings = readingsForGrade(entry);
        const href = hrefFor?.(entry) ?? null;
        const hidden = hideReadings && !revealedKanji?.has(entry.kanji);
        const pills = (
          <>
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
          </>
        );

        /*
         * One line per kanji, for scanning a whole grade. The readings sit
         * beside the meaning rather than under it, and the row keeps its
         * right padding clear so the stroke control never lands on the text.
         */
        const rowBody = (
          <div className="flex min-w-0 items-center gap-3">
            <span lang="ja" translate="no" className={`w-9 shrink-0 text-2xl font-black leading-none text-kanji ${JP_TEXT_CLASS}`}>
              {entry.kanji}
            </span>
            <span className="w-28 shrink-0 truncate text-sm font-black text-foreground" title={entry.primaryMeaning ?? ""}>
              {entry.primaryMeaning ?? GRADE_EXPLORER_COPY.noReadings}
            </span>
            {hidden ? (
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/35">
                {GRADE_EXPLORER_COPY.quizTapToReveal}
              </span>
            ) : (
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <ReadingRow label={GRADE_EXPLORER_COPY.onReadings} readings={readings.on} />
                <ReadingRow label={GRADE_EXPLORER_COPY.kunReadings} readings={readings.kun} />
              </span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1 pr-9">{pills}</span>
          </div>
        );

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
                <p className="py-1 text-xs font-bold uppercase tracking-[0.08em] text-foreground/35">
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

        const body = rows ? rowBody : cardBody;
        const chosen = Boolean(chosenKanji?.has(entry.kanji));
        const shell = `${
          rows
            ? "rounded-xl border border-kanji/40 bg-kanji/5 px-3 py-2 transition"
            : "rounded-2xl border border-kanji/40 bg-kanji/5 p-3 transition"
        }${chosen ? " ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`;
        return (
          <li key={entry.kanji} className="group relative min-w-0">
            {/*
              * Hidden until the card is hovered or focused, and always shown
              * where there is no hover to give. One control per card is noise
              * at a screenful of cards, and while it sat there permanently it
              * covered the end of a long kun reading - 外 read
              * `そと、ほか、はずす、ほ` with the rest behind the button.
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
              className={`absolute z-10 opacity-0 ${rows ? "right-2 top-1/2 -translate-y-1/2" : "bottom-2 right-2"} transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100`}
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
                className={`absolute z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-black text-white ${
                  rows ? "right-2 top-1/2 -translate-y-1/2" : "bottom-2 right-2"
                }`}
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
