"use client";

import { useState } from "react";

import Link from "next/link";

import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { SubjectSelectionBar, SubjectSelectionToggle } from "@/app/shared/SubjectSelectionControls";
import { encodeSelection, SUBJECT_SELECTION_COPY } from "@/app/shared/subjectSelection";
import { useSubjectSelection } from "@/app/shared/useSubjectSelection";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import GradeKanjiGrid from "./GradeKanjiGrid";
import { GRADE_REVEAL_MODES, GRADE_REVEAL_STORAGE_KEY, GRADE_VIEW_MODE_STORAGE_KEY, type GradeRevealMode } from "./gradeExplorerView";

type Props = {
  items: SchoolGradeKanjiEntry[];
  /** The practice sheet's path. The board does not build sheet options. */
  practicePath: string;
};

/**
 * The grade grid, with a quiz mode over it.
 *
 * A grade test asks for the on and kun readings of a character, so a page that
 * always shows them can only be read, not practised. Hiding them turns the same
 * grid into a self-test: see the kanji, say the readings, select the card to
 * check. Nothing is recorded — this is the rehearsal before the real thing.
 */
export default function GradeKanjiBoard({ items, practicePath }: Props) {
  /*
   * Read once at mount rather than in an effect. A new grade or page remounts
   * this component through its `key`, which is also what clears what was
   * revealed - no effect has to watch for the change.
   */
  const [mode, setMode] = useState<GradeRevealMode>(() =>
    getStoredEnum(GRADE_REVEAL_STORAGE_KEY, Object.values(GRADE_REVEAL_MODES), GRADE_REVEAL_MODES.shown));
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(GRADE_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));

  function changeMode(next: GradeRevealMode) {
    setMode(next);
    setStoredEnum(GRADE_REVEAL_STORAGE_KEY, next);
    setRevealed(new Set());
  }

  const selection = useSubjectSelection();

  const quizzing = mode === GRADE_REVEAL_MODES.hidden;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            // Quizzing and choosing both claim the card's click; one at a time.
            if (selection.choosing) selection.cancel();
            changeMode(quizzing ? GRADE_REVEAL_MODES.shown : GRADE_REVEAL_MODES.hidden);
          }}
          className={`inline-flex h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.08em] transition ${
            quizzing
              ? "border-kanji bg-kanji text-white"
              : "border-line bg-surface text-foreground/75 hover:bg-surface-muted"
          }`}
        >
          {quizzing ? GRADE_EXPLORER_COPY.quizOn : GRADE_EXPLORER_COPY.quizOff}
        </button>

        {quizzing ? (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/50">
              {GRADE_EXPLORER_COPY.quizHint}
            </span>
            {revealed.size > 0 ? (
              <button
                type="button"
                onClick={() => setRevealed(new Set())}
                className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted"
              >
                {GRADE_EXPLORER_COPY.quizReset} ({revealed.size})
              </button>
            ) : null}
          </>
        ) : null}

        <SubjectSelectionToggle
          className="ml-auto"
          selection={selection}
        />

        <SubjectViewModeToggle
          value={viewMode}
          onChange={(next) => {
            setViewMode(next);
            setStoredEnum(GRADE_VIEW_MODE_STORAGE_KEY, next);
          }}
        />
      </div>

      <SubjectSelectionBar selection={selection} visibleKeys={items.map((entry) => entry.kanji)}>
        {selection.count > 0 ? (
          <Link
            href={`${practicePath}?source=picked&picked=${encodeURIComponent(encodeSelection(selection.chosen))}`}
            className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            {SUBJECT_SELECTION_COPY.practise}
          </Link>
        ) : null}
      </SubjectSelectionBar>

      <GradeKanjiGrid
        items={items}
        viewMode={viewMode}
        chosenKanji={selection.choosing ? selection.chosen : undefined}
        onChoose={selection.choosing ? selection.toggle : undefined}
        hideReadings={quizzing}
        revealedKanji={revealed}
        onReveal={
          quizzing && !selection.choosing
            ? (kanji) =>
                setRevealed((prev) => {
                  const next = new Set(prev);
                  if (next.has(kanji)) next.delete(kanji);
                  else next.add(kanji);
                  return next;
                })
            : undefined
        }
      />

    </>
  );
}
