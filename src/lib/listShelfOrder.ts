/**
 * Searching, sorting and paging a shelf of lists.
 *
 * Three surfaces hold lists rather than subjects - the member's own shelf,
 * the lists they follow, and the ones they archived - and each carries a
 * different row: a `ListCard` with its items, a `FollowedList` with an owner,
 * a `StudyListSummary`. Only the shelf's own shelf had controls at all, and
 * they were written inline in the component that used them, so Following and
 * Archived were two lists you could only read top to bottom.
 *
 * The rows have nothing in common as types and everything in common as
 * things-on-a-shelf: a name, a size, when they last changed. Callers supply
 * that reading; this module never sees the row.
 */

export const LIST_SHELF_SORTS = {
  updated: "updated",
  name: "name",
  size: "size",
} as const;

export type ListShelfSort = (typeof LIST_SHELF_SORTS)[keyof typeof LIST_SHELF_SORTS];

export const LIST_SHELF_SORT_VALUES = Object.values(LIST_SHELF_SORTS) as ListShelfSort[];

export function isListShelfSort(value: string): value is ListShelfSort {
  return (LIST_SHELF_SORT_VALUES as readonly string[]).includes(value);
}

/** What any shelf row has to be able to say about itself. */
export type ShelfFacts = {
  name: string;
  count: number;
  /** ISO, or null for a row that has never said when it changed. */
  updatedAt: string | null;
  /**
   * Anything else the search should reach - the items a list holds, the name
   * of whoever owns it. Searching only the name meant a member who remembered
   * the kanji but not what they had called the list found nothing.
   */
  searchable?: readonly string[];
};

/**
 * The shelf as the reader asked for it.
 *
 * The default order is the one every shelf already had - last changed first -
 * and reversing is that same sort backwards rather than a fourth sort. Ties
 * break on the name so the order is total: two lists changed in the same
 * second must not swap places between renders.
 */
export function orderShelf<T>(
  rows: readonly T[],
  facts: (row: T) => ShelfFacts,
  sort: ListShelfSort,
  reversed: boolean,
  query: string,
): T[] {
  const term = query.trim().toLowerCase();
  const kept = term
    ? rows.filter((row) => {
        const { name, searchable = [] } = facts(row);
        return (
          name.toLowerCase().includes(term) ||
          searchable.some((value) => value.toLowerCase().includes(term))
        );
      })
    : [...rows];

  kept.sort((left, right) => {
    const a = facts(left);
    const b = facts(right);
    const byName = a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    if (sort === LIST_SHELF_SORTS.name) return byName;
    if (sort === LIST_SHELF_SORTS.size) return b.count - a.count || byName;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || byName;
  });

  return reversed ? kept.reverse() : kept;
}

/**
 * How many rows a shelf shows before it pages.
 *
 * Chosen against the grid rather than the data: at the widest the shelf is
 * four cards to a row, so twenty-four is six full rows and nothing sits alone
 * on the last one.
 */
export const SHELF_PAGE_SIZE = 24;

/** The page a reader should actually be on, given how much is left after a search. */
export function clampPage(page: number, total: number, pageSize = SHELF_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / pageSize)));
}

/**
 * One page of a shelf, and how many pages there are.
 *
 * Clamped rather than trusted: typing into the search box on page four leaves
 * a reader past the end of a two-page result, and an empty shelf that says
 * "no lists match" when three do is the kind of bug nobody reports because it
 * looks like the search working.
 */
export function pageOfShelf<T>(rows: readonly T[], page: number, pageSize = SHELF_PAGE_SIZE): {
  rows: T[];
  page: number;
  pageCount: number;
} {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = clampPage(page, rows.length, pageSize);
  return { rows: rows.slice((safe - 1) * pageSize, safe * pageSize), page: safe, pageCount };
}
