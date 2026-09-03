"use client";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import {
  LIST_ITEM_SORTS,
  LIST_ITEM_SORT_VALUES,
  type ListItemSort,
} from "@/lib/listItemOrder";

/**
 * Sorting what one list holds.
 *
 * Its own component because the list page's options row is already carrying
 * kinds, a search box, the burned toggle, editing, two sheet links, selection
 * and the density toggle - and because the labels belong next to the control
 * that shows them rather than in the page that happens to contain it.
 */

const LABELS: Record<ListItemSort, string> = {
  [LIST_ITEM_SORTS.order]: STUDY_LIST_COPY.sortItemOrder,
  [LIST_ITEM_SORTS.glyph]: STUDY_LIST_COPY.sortItemGlyph,
  [LIST_ITEM_SORTS.meaning]: STUDY_LIST_COPY.sortItemMeaning,
  [LIST_ITEM_SORTS.level]: STUDY_LIST_COPY.sortItemLevel,
};

const PILL = "h-9 rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.08em] transition";

export default function ListItemSortControl({
  sort,
  onSort,
  reversed,
  onReversed,
}: {
  sort: ListItemSort;
  onSort: (next: ListItemSort) => void;
  reversed: boolean;
  onReversed: (next: boolean) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
        {STUDY_LIST_COPY.sortLabel}
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as ListItemSort)}
          className={`${PILL} border-line bg-surface text-foreground/70`}
        >
          {LIST_ITEM_SORT_VALUES.map((option) => (
            <option key={option} value={option}>
              {LABELS[option]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-pressed={reversed}
        onClick={() => onReversed(!reversed)}
        className={`${PILL} ${
          reversed ? "border-accent text-accent" : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
        }`}
      >
        {STUDY_LIST_COPY.reverse}
      </button>
    </span>
  );
}
