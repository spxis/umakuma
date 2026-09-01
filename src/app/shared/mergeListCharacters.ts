/**
 * Adding a chosen set to a list that already has things in it.
 *
 * Kept apart from the component so the rule is testable: adding is a union,
 * not a replacement. Sending only the new characters would quietly empty a
 * list somebody had been building for weeks, and that is the kind of mistake
 * a save button gets exactly one chance to make.
 */

/** The list's characters with the chosen ones added, order kept, no repeats. */
export function mergeListCharacters(existing: string, chosen: Iterable<string>): string {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const character of [...existing, ...chosen]) {
    if (!character.trim() || seen.has(character)) continue;
    seen.add(character);
    merged.push(character);
  }

  return merged.join("");
}

/** How many of the chosen are not in the list yet, for what the button says. */
export function countNewCharacters(existing: string, chosen: Iterable<string>): number {
  const already = new Set([...existing]);
  let added = 0;
  const counted = new Set<string>();

  for (const character of chosen) {
    if (already.has(character) || counted.has(character)) continue;
    counted.add(character);
    added += 1;
  }

  return added;
}
