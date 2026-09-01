"use client";

import Link from "next/link";

import SaveSelectionAsList from "./SaveSelectionAsList";
import { SubjectSelectionBar } from "./SubjectSelectionControls";
import { encodeSelection, SUBJECT_SELECTION_COPY } from "./subjectSelection";
import type { SubjectSelection } from "./useSubjectSelection";

/**
 * What a chosen set of characters can be turned into.
 *
 * The bar itself is generic - it counts, selects a page, clears - and this
 * adds the two destinations that make choosing worth doing: a practice sheet
 * and a saved list. It was written into the grade board, which meant the JLPT
 * explorer could not offer selection without copying it, and a third surface
 * would have copied it again.
 *
 * Both destinations take characters rather than subject ids, which is what
 * lets one component serve a school grade, a JLPT level and a WaniKani level
 * alike: the character is the only identifier all three catalogues share.
 */
export default function KanjiSelectionBar({
  selection,
  visibleKeys,
  accountId,
  practicePath,
}: {
  selection: SubjectSelection;
  /** The keys on screen now, in the order they are drawn. */
  visibleKeys: string[];
  /** Whose lists a set is saved to; null for a visitor, who cannot save. */
  accountId: string | null;
  /**
   * Where a practice sheet is built. Empty where the surface cannot know -
   * the tagged lists open from anywhere, including pages that are not under a
   * member - and the offer is simply withheld rather than pointing nowhere.
   */
  practicePath: string;
}) {
  return (
    <SubjectSelectionBar selection={selection} visibleKeys={visibleKeys}>
      {selection.count > 0 && accountId ? (
        <SaveSelectionAsList chosen={selection.chosen} accountId={accountId} onSaved={selection.cancel} />
      ) : null}
      {selection.count > 0 && practicePath ? (
        <Link
          href={`${practicePath}/picked?picked=${encodeURIComponent(encodeSelection(selection.chosen))}`}
          className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          {SUBJECT_SELECTION_COPY.practise}
        </Link>
      ) : null}
    </SubjectSelectionBar>
  );
}
