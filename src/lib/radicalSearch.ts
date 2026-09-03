/**
 * Finding a kanji by its parts.
 *
 * The way you look up a character you cannot read: you cannot type it and you
 * do not know its readings, but you can see 水 on the left and 田 on the right.
 * Pick those two and the list is short.
 *
 * Every radical narrows: the matches are the kanji containing *all* of the
 * chosen radicals, not any of them. And once something is chosen, most of the
 * other radicals cannot narrow anything further - they appear in no remaining
 * kanji - so they are dimmed rather than left as 250 dead ends. That dimming is
 * the whole ergonomics of the thing, and it is why this is a set intersection
 * rather than a filter over a list.
 */
export type RadicalEntry = {
  radical: string;
  strokes: number;
  /** Every kanji containing it, as one string. */
  kanji: string;
};

export type RadicalGroup = { strokes: number; radicals: string[] };

/** How many matches a picker offers before it asks for another radical. */
export const RADICAL_MATCH_LIMIT = 120;

/** The grid: radicals in stroke-count order, grouped by the count. */
export function radicalGroups(entries: readonly RadicalEntry[]): RadicalGroup[] {
  const groups = new Map<number, string[]>();
  for (const entry of entries) {
    const held = groups.get(entry.strokes);
    if (held) held.push(entry.radical);
    else groups.set(entry.strokes, [entry.radical]);
  }
  return [...groups.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([strokes, radicals]) => ({ strokes, radicals }));
}

function kanjiSet(entry: RadicalEntry): Set<string> {
  return new Set([...entry.kanji]);
}

/**
 * The kanji containing every one of the chosen radicals.
 *
 * Nothing chosen means nothing to show: the whole dictionary is not an answer
 * to a question nobody has asked yet.
 */
export function kanjiForRadicals(entries: readonly RadicalEntry[], chosen: readonly string[]): string[] {
  if (chosen.length === 0) return [];

  const wanted = new Set(chosen);
  const sets = entries.filter((entry) => wanted.has(entry.radical)).map(kanjiSet);
  /* A radical we do not know cannot be satisfied, so the answer is nothing. */
  if (sets.length !== wanted.size) return [];

  const [first, ...rest] = sets;
  return [...first!].filter((kanji) => rest.every((set) => set.has(kanji)));
}

/**
 * The radicals that can still narrow what is left.
 *
 * A radical appearing in none of the remaining kanji is a dead end, and Jisho's
 * grid dims those rather than letting you pick your way to an empty list. The
 * chosen ones stay live: taking one back must always be possible.
 */
export function usableRadicals(
  entries: readonly RadicalEntry[],
  chosen: readonly string[],
): Set<string> {
  if (chosen.length === 0) return new Set(entries.map((entry) => entry.radical));

  const matches = new Set(kanjiForRadicals(entries, chosen));
  const usable = new Set(chosen);
  if (matches.size === 0) return usable;

  for (const entry of entries) {
    if (usable.has(entry.radical)) continue;
    for (const kanji of entry.kanji) {
      if (matches.has(kanji)) {
        usable.add(entry.radical);
        break;
      }
    }
  }
  return usable;
}

/** Keeps a picked radical in the grid's own order, so the choice reads as a row of the grid. */
export function orderChosen(entries: readonly RadicalEntry[], chosen: readonly string[]): string[] {
  const order = new Map(entries.map((entry, index) => [entry.radical, index]));
  return [...chosen]
    .filter((radical) => order.has(radical))
    .sort((left, right) => order.get(left)! - order.get(right)!);
}

/**
 * The radicals a character is written with, fewest strokes first.
 *
 * RADKFILE is stored the other way round - each radical listing the kanji that
 * contain it - because that is the direction a search runs. A kanji page asks
 * the opposite question, and 253 membership tests answer it, which is nothing
 * next to keeping a second copy of the index in the other direction.
 *
 * Simplest parts first, so the list reads the way the character is built up
 * rather than in the file's own order.
 */
export function radicalsInKanji(
  entries: readonly RadicalEntry[],
  kanji: string,
): RadicalEntry[] {
  if (kanji.length === 0) return [];
  return entries
    .filter((entry) => entry.kanji.includes(kanji))
    /*
     * Codepoint order breaks the tie, not `localeCompare`: a Japanese
     * collation puts 月 before 日 and depends on the ICU data the runtime
     * happens to carry, so the same character could list its parts in two
     * orders on two machines.
     */
    .sort(
      (left, right) =>
        left.strokes - right.strokes ||
        (left.radical < right.radical ? -1 : left.radical > right.radical ? 1 : 0),
    );
}
