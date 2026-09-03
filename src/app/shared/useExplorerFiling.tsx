"use client";

import { useMemo, type ReactNode } from "react";

import type { FilerHit } from "@/lib/subjectFiler";

import SubjectFilerCell from "./SubjectFilerCell";
import SubjectFilerToggle from "./SubjectFilerToggle";
import { useFilerOpen, useSubjectFiler } from "./useSubjectFiler";

/**
 * Filing marks on an explorer, wired the same way on each of them.
 *
 * Search, the subject pages and the glyph viewer could all file a subject onto
 * a list; the four explorer grids - JLPT, grades, level and study - could not,
 * which is where somebody is actually browsing when they decide a kanji is
 * worth keeping. Each of them draws the shared `SubjectRows`/`SubjectCards`
 * pair, so the marks go in through the slots that pair already has rather than
 * into the pair itself.
 *
 * The wiring is five pieces every time - the shared open flag, whether an
 * account is even present, the list fetch, a toggle to show it and a cell per
 * row - so it is one hook rather than five copies. A surface then spends three
 * lines: the toggle in its controls, and the two render slots.
 *
 * `toHit` must be stable across renders - a module-level function, or one
 * wrapped in `useCallback` - because the hits it builds decide when the tag
 * fetch runs again.
 */
export type ExplorerFiling<TRow> = {
  /** Whether the marks are showing. False for a visitor, whatever the flag says. */
  filing: boolean;
  /** The control that opens and closes them; null when there is nobody to file for. */
  toggle: ReactNode;
  /** For `SubjectRows`: the filing column at the end of a row. */
  renderTrailing: ((row: TRow) => ReactNode) | undefined;
  /** For `SubjectCards`: the same marks on a line under the card. */
  renderUnder: ((row: TRow) => ReactNode) | undefined;
};

export function useExplorerFiling<TRow>(
  /** Whose lists to file onto. Null for a visitor, or for somebody else's page. */
  accountId: string | null,
  rows: readonly TRow[],
  toHit: (row: TRow) => FilerHit,
  /**
   * `lists` on a surface that already draws trouble and favourite of its own -
   * the explorer cards carry them inside the glyph, and two sets of the same
   * two buttons a few centimetres apart is a question about whether they mean
   * the same thing rather than a second chance to press one.
   */
  marks: "all" | "lists" = "all",
): ExplorerFiling<TRow> {
  const [open, setOpen] = useFilerOpen();
  const filing = Boolean(accountId) && open;

  const hits = useMemo(() => rows.map(toHit), [rows, toHit]);
  const filer = useSubjectFiler(accountId, hits, filing);

  const toggle = accountId ? (
    <SubjectFilerToggle open={open} onToggle={() => setOpen((was) => !was)} error={filer.error} />
  ) : null;

  return {
    filing,
    toggle,
    renderTrailing: filing
      ? (row) => (
          <SubjectFilerCell
            hit={toHit(row)}
            filer={filer}
            marks={marks}
            className="basis-full pb-2 pl-3 md:basis-auto md:pb-0"
          />
        )
      : undefined,
    renderUnder: filing
      ? (row) => (
          <SubjectFilerCell hit={toHit(row)} filer={filer} marks={marks} variant="rail" className="mt-1" />
        )
      : undefined,
  };
}
