import { mergeListItems } from "@/app/shared/mergeListItems";
import { STUDY_LIST_LIMITS, type StudyListItemRef } from "./studyListRules";

/**
 * Two or more lists becoming one.
 *
 * A union in the order the lists were chosen, each item once: what somebody
 * means by merging "Week 1" and "Week 2" is one list that reads as Week 1
 * then Week 2, without the overlap written twice. The order the lists are
 * picked in is the order they combine in, which is why the panel numbers
 * them as they are chosen rather than sorting them.
 */
export function unionListItems(lists: readonly (readonly StudyListItemRef[])[]): StudyListItemRef[] {
  return lists.reduce<StudyListItemRef[]>((merged, items) => mergeListItems(merged, items), []).slice(0, STUDY_LIST_LIMITS.items);
}

/** How many items the merge would hold, and how many of them were shared. */
export function mergeSummary(lists: readonly (readonly StudyListItemRef[])[]): { total: number; shared: number } {
  const total = unionListItems(lists).length;
  const counted = lists.reduce((sum, items) => sum + items.length, 0);
  return { total, shared: Math.max(0, counted - total) };
}
