"use client";

import type { ReactNode } from "react";

import { SUBJECT_SELECTION_COPY, SUBJECT_SELECTION_LIMIT } from "./subjectSelection";
import type { SubjectSelection } from "./useSubjectSelection";

/**
 * The choosing control, and the bar that appears once something is chosen.
 *
 * Sits beside the density toggle, because it is the same kind of decision: how
 * you want to work with this list, rather than what is in it. The destinations
 * are passed in rather than listed here - this component knows how to choose,
 * not what choosing is for.
 */

const BUTTON =
  "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.08em] transition";
const QUIET = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";
const ACTIVE = "border-accent bg-accent text-white";

export function SubjectSelectionToggle({
  selection,
  className,
}: {
  selection: SubjectSelection;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={selection.choosing ? selection.cancel : selection.start}
      className={`${BUTTON} ${selection.choosing ? ACTIVE : QUIET} ${className ?? ""}`.trim()}
    >
      {selection.choosing ? SUBJECT_SELECTION_COPY.cancel : SUBJECT_SELECTION_COPY.start}
    </button>
  );
}

/**
 * What you can do with what you chose.
 *
 * Only while choosing, and it says the count plainly: a selection you cannot
 * see the size of is one you have to re-count by eye before trusting a link.
 */
export function SubjectSelectionBar({
  selection,
  /** Keys visible on the current page, for "All on this page". */
  visibleKeys,
  /** The destinations, rendered by whoever has one to offer. */
  children,
}: {
  selection: SubjectSelection;
  visibleKeys: string[];
  children?: ReactNode;
}) {
  if (!selection.choosing) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/40 bg-accent/5 px-3 py-2">
      <span className="text-xs font-black text-foreground/80">
        {selection.count > 0
          ? `${selection.count} ${SUBJECT_SELECTION_COPY.chosenSuffix}`
          : SUBJECT_SELECTION_COPY.emptyHint}
      </span>

      {selection.atLimit ? (
        <span className="text-[11px] font-semibold text-foreground/60">
          {SUBJECT_SELECTION_COPY.limitReached}
        </span>
      ) : selection.count > 0 ? (
        /*
         * Offered once something is picked, because that is the moment a range
         * becomes possible - shift-clicking with nothing anchored does nothing
         * to explain, and a hint shown before it can be used reads as noise.
         * It stands down at the limit, where the more urgent thing is said.
         */
        <span className="hidden text-[11px] font-semibold text-foreground/60 sm:inline">
          {SUBJECT_SELECTION_COPY.rangeHint}
        </span>
      ) : null}

      <span className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => selection.addAll(visibleKeys)}
          disabled={selection.count >= SUBJECT_SELECTION_LIMIT}
          className={`${BUTTON} ${QUIET} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {SUBJECT_SELECTION_COPY.selectAll}
        </button>
        {selection.count > 0 ? (
          <button type="button" onClick={selection.clear} className={`${BUTTON} ${QUIET}`}>
            {SUBJECT_SELECTION_COPY.clear}
          </button>
        ) : null}
        {children}
      </span>
    </div>
  );
}
