/**
 * The order a list's own items are read in.
 *
 * A shelf sorts lists; this sorts what one list holds, and the two are not the
 * same question. The default here is not "last changed" but **the order the
 * list keeps** - somebody arranged this week's ten characters in that order
 * and meant it, which is why a copy taken from a shared list appends rather
 * than merges. Every other sort is something a reader asks for once, to find
 * one item, and then leaves.
 */

export const LIST_ITEM_SORTS = {
  /** As the owner arranged them. */
  order: "order",
  glyph: "glyph",
  meaning: "meaning",
  level: "level",
} as const;

export type ListItemSort = (typeof LIST_ITEM_SORTS)[keyof typeof LIST_ITEM_SORTS];

export const LIST_ITEM_SORT_VALUES = Object.values(LIST_ITEM_SORTS) as ListItemSort[];

export function isListItemSort(value: string): value is ListItemSort {
  return (LIST_ITEM_SORT_VALUES as readonly string[]).includes(value);
}

/** What an item has to be able to say to be sorted. */
export type ItemFacts = {
  glyph: string;
  meaning: string;
  /** Null where the catalogue does not place it, which sorts last. */
  level: number | null;
};

/**
 * The items as the reader asked for them.
 *
 * `order` returns the list untouched rather than sorting by an index, so it
 * cannot disagree with the order the rows arrived in.
 *
 * An item the catalogue knows nothing about sorts to the end and stays there
 * when the sort is reversed. Reversing the whole array instead floats every
 * such item to the top, which is the one position the sort cannot mean: an
 * item with no level has no place in an order of levels, and an item with no
 * meaning has none in an alphabet. Reversed means "the other end of the
 * scale", not "the list backwards".
 */
export function orderListItems<T>(
  items: readonly T[],
  facts: (item: T) => ItemFacts,
  sort: ListItemSort,
  reversed: boolean,
): T[] {
  if (sort === LIST_ITEM_SORTS.order) {
    const kept = [...items];
    return reversed ? kept.reverse() : kept;
  }

  /* A glyph is always there, so that sort has nothing to hold back. */
  if (sort === LIST_ITEM_SORTS.glyph) {
    const kept = [...items];
    kept.sort((left, right) => facts(left).glyph.localeCompare(facts(right).glyph, "ja"));
    return reversed ? kept.reverse() : kept;
  }

  const known = (item: T): boolean =>
    sort === LIST_ITEM_SORTS.level ? facts(item).level !== null : facts(item).meaning.trim().length > 0;

  const placed = items.filter(known);
  const unplaced = items.filter((item) => !known(item));

  placed.sort((left, right) => {
    const a = facts(left);
    const b = facts(right);
    if (sort === LIST_ITEM_SORTS.level) {
      return (a.level ?? 0) - (b.level ?? 0) || a.glyph.localeCompare(b.glyph, "ja");
    }
    return (
      a.meaning.localeCompare(b.meaning, "en", { sensitivity: "base" }) ||
      a.glyph.localeCompare(b.glyph, "ja")
    );
  });

  return [...(reversed ? placed.reverse() : placed), ...unplaced];
}

/**
 * How many items a list shows at once.
 *
 * A list holds up to five hundred, and five hundred glyph cards is a page
 * that takes a second to lay out and a long scroll to reach the end of. Sixty
 * is five rows of the widest grid and about a screen and a half.
 */
export const LIST_ITEM_PAGE_SIZE = 60;
