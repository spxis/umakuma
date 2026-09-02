import { listItemId, type StudyListItemRef } from "./studyListRules";

/**
 * What has been added to the list a copy came from.
 *
 * A copy is a snapshot, and the friend it came from keeps adding to theirs. The
 * two ways out of that were both wrong: subscribe and you no longer own what
 * you are looking at, copy again and you lose everything you changed. So a
 * copy remembers its source and can be asked what is new.
 *
 * Additions only, and deliberately.
 *
 * An item missing from the copy but present in the source is either new or one
 * the member took out on purpose, and nothing recorded here can tell those
 * apart - so the answer is offered rather than applied, one item at a time,
 * and taking something out a second time makes it stop being offered because
 * it is then in neither list.
 *
 * Removals are not carried across at all. A friend tidying their list is not
 * grounds for deleting from somebody else's, and a copy exists precisely
 * because its owner wanted their own.
 */
export function addedToSource(
  source: readonly StudyListItemRef[],
  copy: readonly StudyListItemRef[],
): StudyListItemRef[] {
  const held = new Set(copy.map(listItemId));
  const seen = new Set<string>();

  return source.flatMap((item) => {
    const id = listItemId(item);
    if (held.has(id) || seen.has(id)) return [];
    seen.add(id);
    return [item];
  });
}

/**
 * The copy with items taken across, kept in the copy's own order.
 *
 * Appended rather than merged into the source's order: the member arranged
 * their list, and a pull is an addition to the end of it, not a reshuffle.
 * Anything already held is left exactly as it is, notes and all.
 */
export function withItemsTaken(
  copy: readonly StudyListItemRef[],
  taken: readonly StudyListItemRef[],
): StudyListItemRef[] {
  const held = new Set(copy.map(listItemId));
  const added = taken.filter((item) => {
    const id = listItemId(item);
    if (held.has(id)) return false;
    held.add(id);
    return true;
  });

  return [...copy, ...added];
}
