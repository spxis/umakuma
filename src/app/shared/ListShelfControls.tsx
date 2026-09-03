"use client";

import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import type { SubjectViewMode } from "@/app/shared/subjectListView";
import {
  LIST_SHELF_SORTS,
  LIST_SHELF_SORT_VALUES,
  type ListShelfSort,
} from "@/lib/listShelfOrder";

/**
 * The controls every shelf of lists carries.
 *
 * Search, sort, reverse and - where a shelf draws cards - the density toggle.
 * They existed only on the member's own shelf, written inline in the component
 * that used them, so Following and Archived were lists you could only read top
 * to bottom. Lifting them out is what makes "every list surface is sortable,
 * reversible, pageable and searchable" one thing to build rather than three to
 * keep in step.
 *
 * The view toggle is optional because not every shelf has two densities to
 * offer: Archived is a row of names and a restore button, and a grid of them
 * would be four cards saying nothing.
 */

const CONTROL =
  "h-8 rounded-full border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70";

const SORT_LABELS: Record<ListShelfSort, string> = {
  [LIST_SHELF_SORTS.updated]: STUDY_LIST_COPY.sortUpdated,
  [LIST_SHELF_SORTS.name]: STUDY_LIST_COPY.sortName,
  [LIST_SHELF_SORTS.size]: STUDY_LIST_COPY.sortSize,
};

export default function ListShelfControls({
  query,
  onQuery,
  sort,
  onSort,
  reversed,
  onReversed,
  viewMode,
  onViewMode,
  searchLabel = STUDY_LIST_COPY.searchLists,
}: {
  query: string;
  onQuery: (next: string) => void;
  sort: ListShelfSort;
  onSort: (next: ListShelfSort) => void;
  reversed: boolean;
  onReversed: (next: boolean) => void;
  /** Left off by a shelf that has only one density worth offering. */
  viewMode?: SubjectViewMode;
  onViewMode?: (next: SubjectViewMode) => void;
  searchLabel?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        className="h-8 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-foreground"
      />
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
        {STUDY_LIST_COPY.sortLabel}
        <select value={sort} onChange={(event) => onSort(event.target.value as ListShelfSort)} className={CONTROL}>
          {LIST_SHELF_SORT_VALUES.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-pressed={reversed}
        onClick={() => onReversed(!reversed)}
        className={`${CONTROL} ${reversed ? "border-accent text-accent" : ""}`}
      >
        {STUDY_LIST_COPY.reverse}
      </button>
      {viewMode && onViewMode ? <SubjectViewModeToggle value={viewMode} onChange={onViewMode} /> : null}
    </div>
  );
}
