"use client";

import { useState } from "react";

import KanjiSelectionBar from "@/app/shared/KanjiSelectionBar";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { SubjectSelectionToggle } from "@/app/shared/SubjectSelectionControls";
import { useSubjectSelection } from "@/app/shared/useSubjectSelection";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { usePersistedEnum } from "@/lib/usePersistedEnum";
import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import { GRADE_EXPLORER_COPY } from "./GradeExplorer.constants";
import GradeKanjiGrid from "./GradeKanjiGrid";
import { GRADE_REVEAL_MODES, GRADE_VIEW_MODE_STORAGE_KEY, gradeEntryHit, type GradeRevealMode } from "./gradeExplorerView";
import { useExplorerFiling } from "@/app/shared/useExplorerFiling";
import { DISPLAY_PREFERENCE_COOKIES, writeDisplayPreferenceCookie } from "@/lib/displayPreferenceCookie";
import CurriculumStamp from "@/app/shared/CurriculumStamp";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

type Props = {
  items: SchoolGradeKanjiEntry[];
  /** The practice sheet's path. The board does not build sheet options. */
  practicePath: string;
  /** Whose lists a chosen set is saved to. Absent for a visitor. */
  accountId: string | null;
  /**
   * Quiz mode as the server already drew it.
   *
   * Read from a cookie by the page rather than from localStorage here: this
   * decides what the first paint contains, and reading it after hydration
   * meant every reading painted and was then hidden.
   */
  initialRevealMode: GradeRevealMode;
};

/**
 * The grade grid, with a quiz mode over it.
 *
 * A grade test asks for the on and kun readings of a character, so a page that
 * always shows them can only be read, not practised. Hiding them turns the same
 * grid into a self-test: see the kanji, say the readings, select the card to
 * check. Nothing is recorded — this is the rehearsal before the real thing.
 */
export default function GradeKanjiBoard({ items, practicePath, accountId, initialRevealMode }: Props) {
  /*
   * Seeded from the server's own value, so the markup React hydrates matches
   * the markup it was given. A new grade or page remounts this component
   * through its `key`, which is also what clears what was revealed - no effect
   * has to watch for the change.
   */
  const [mode, setMode] = useState<GradeRevealMode>(initialRevealMode);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = usePersistedEnum<SubjectViewMode>(GRADE_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid);

  function changeMode(next: GradeRevealMode) {
    setMode(next);
    /* A cookie, so the next server render draws it right the first time. */
    writeDisplayPreferenceCookie(DISPLAY_PREFERENCE_COOKIES.gradeReveal, next);
    setRevealed(new Set());
  }

  const selection = useSubjectSelection("grades");
  /* The marks a member files with, shut until they ask for them. */
  const filing = useExplorerFiling(accountId, items, gradeEntryHit);

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
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
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

        <span className="ml-auto">{filing.toggle}</span>

        <SubjectSelectionToggle
          selection={selection}
        />

        <SubjectViewModeToggle
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      <KanjiSelectionBar
        selection={selection}
        visibleKeys={items.map((entry) => entry.kanji)}
        accountId={accountId}
        practicePath={practicePath}
      />

      <GradeKanjiGrid
        items={items}
        viewMode={viewMode}
        selection={selection}
        chosenKanji={selection.choosing ? selection.chosen : undefined}
        onChoose={
          selection.choosing
            ? (kanji, extend) => {
                // The grid's own order, which is what a swept range follows.
                if (extend) selection.extendTo(kanji, items.map((entry) => entry.kanji));
                else selection.toggle(kanji);
              }
            : undefined
        }
        hideReadings={quizzing}
        renderFilingTrailing={filing.renderTrailing}
        renderFilingUnder={filing.renderUnder}
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

      {/* Provenance, last and faint: the grade ladder moves too, and 12 kanji
          changed level at UG 2.0.0. */}
      <CurriculumStamp stream={LADDER_STREAMS.ug} className="mt-2 px-1" />
    </>
  );
}
