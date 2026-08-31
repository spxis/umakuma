"use client";

import { useState } from "react";

import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
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
};

/**
 * The grade grid, with a quiz mode over it.
 *
 * A grade test asks for the on and kun readings of a character, so a page that
 * always shows them can only be read, not practised. Hiding them turns the same
 * grid into a self-test: see the kanji, say the readings, select the card to
 * check. Nothing is recorded — this is the rehearsal before the real thing.
 */
export default function GradeKanjiBoard({ items }: Props) {
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

  const quizzing = mode === GRADE_REVEAL_MODES.hidden;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => changeMode(quizzing ? GRADE_REVEAL_MODES.shown : GRADE_REVEAL_MODES.hidden)}
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

        <SubjectViewModeToggle
          className="ml-auto"
          value={viewMode}
          onChange={(next) => {
            setViewMode(next);
            setStoredEnum(GRADE_VIEW_MODE_STORAGE_KEY, next);
          }}
        />
      </div>

      <GradeKanjiGrid
        items={items}
        viewMode={viewMode}
        hideReadings={quizzing}
        revealedKanji={revealed}
        onReveal={
          quizzing
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
