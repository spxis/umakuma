import { SUBJECT_TYPES, SUBJECT_TYPE_VALUES, isSubjectType, type SubjectType } from "@/lib/domainConstants";
import type { ListPageItem } from "@/lib/listPageItems";

/**
 * What a reader has narrowed a list down to.
 *
 * The list page used to answer this itself, with chips of its own in the accent
 * colour reading ALL / KANJI / WORDS - a second answer to the question every
 * explorer already answers with the shared coloured filter group, and a worse
 * one: a list holding radicals had nowhere to say so, and a word was called a
 * Word here and VOCAB everywhere else. The chips are the shared ones now and
 * the arithmetic behind them is here, where it can be tested without a page.
 */

/** Every subject, as opposed to one kind of them. Not a domain value. */
export const LIST_TYPE_FILTER_ALL = "all";

export type ListTypeFilter = typeof LIST_TYPE_FILTER_ALL | SubjectType;

export type ListTypeCounts = { all: number } & Record<SubjectType, number>;

/**
 * How many of each kind the list holds.
 *
 * Counted from what is left after removals rather than from the list as
 * stored: a chip saying 10 KANJI over nine rows is a chip nobody believes.
 * The catalogue's subject type is the authority, not the kind the list was
 * saved with - a radical tagged as a kanji is still a radical.
 */
export function listTypeCounts(items: readonly ListPageItem[]): ListTypeCounts {
  const counts: ListTypeCounts = {
    all: items.length,
    [SUBJECT_TYPES.radical]: 0,
    [SUBJECT_TYPES.kanji]: 0,
    [SUBJECT_TYPES.vocabulary]: 0,
  };

  for (const item of items) {
    if (isSubjectType(item.subjectType)) counts[item.subjectType] += 1;
  }

  return counts;
}

/** Whether an item survives the chosen kind. */
export function matchesListTypeFilter(item: ListPageItem, filter: ListTypeFilter): boolean {
  return filter === LIST_TYPE_FILTER_ALL || item.subjectType === filter;
}

/**
 * Which chips the group should draw as on.
 *
 * The shared group takes a flag per type because the explorers let a reader
 * show two kinds at once. A list narrows to one, so All lights every chip -
 * which is what "all" looks like there - and a kind lights only itself.
 */
export function listTypeChipStates(filter: ListTypeFilter): Record<SubjectType, boolean> {
  const states = {} as Record<SubjectType, boolean>;
  for (const type of SUBJECT_TYPE_VALUES) {
    states[type] = filter === LIST_TYPE_FILTER_ALL || filter === type;
  }
  return states;
}

/**
 * Whether the filter is worth drawing at all.
 *
 * A list of nothing but kanji gains nothing from a row of chips that cannot
 * change what is on screen, and the control row is already full.
 */
export function listHasMixedTypes(counts: ListTypeCounts): boolean {
  return SUBJECT_TYPE_VALUES.filter((type) => counts[type] > 0).length > 1;
}
