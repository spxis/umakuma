import { listItemId, type StudyListItemRef } from "@/lib/studyListRules";

/**
 * Adding a chosen set to a list that already has things in it.
 *
 * Kept apart from the component so the rule is testable: adding is a union,
 * not a replacement. Sending only the new items would quietly empty a list
 * somebody had been building for weeks, and that is the kind of mistake a
 * save button gets exactly one chance to make.
 */

/** The list's items with the chosen ones added, order kept, no repeats. */
export function mergeListItems(existing: StudyListItemRef[], chosen: Iterable<StudyListItemRef>): StudyListItemRef[] {
  const merged: StudyListItemRef[] = [];
  const seen = new Set<string>();

  for (const item of [...existing, ...chosen]) {
    const id = listItemId(item);
    if (!item.key.trim() || seen.has(id)) continue;
    seen.add(id);
    merged.push(item);
  }

  return merged;
}

/** How many of the chosen are not in the list yet, for what the button says. */
export function countNewItems(existing: StudyListItemRef[], chosen: Iterable<StudyListItemRef>): number {
  const already = new Set(existing.map(listItemId));
  const counted = new Set<string>();
  let added = 0;

  for (const item of chosen) {
    const id = listItemId(item);
    if (already.has(id) || counted.has(id)) continue;
    counted.add(id);
    added += 1;
  }

  return added;
}

/** The list without these items. */
export function withoutListItems(existing: StudyListItemRef[], dropped: Iterable<StudyListItemRef>): StudyListItemRef[] {
  const gone = new Set([...dropped].map(listItemId));
  return existing.filter((item) => !gone.has(listItemId(item)));
}
