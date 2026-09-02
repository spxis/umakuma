import type { ListCard, ListSort } from "./StudyList.types";

/**
 * The saved lists, searched and sorted.
 *
 * Lists, like all data here, are searchable, sortable and reversible. The
 * search reads the name and the items, so "水" finds every list holding it
 * and "week" finds the weeks. The default order is the one the page always
 * had - last changed first - and a reversed sort is the same sort backwards,
 * not a different one.
 */
export function sortListCards(cards: ListCard[], sort: ListSort, reversed: boolean, query: string): ListCard[] {
  const term = query.trim().toLowerCase();
  const kept = term
    ? cards.filter(
        (card) =>
          card.name.toLowerCase().includes(term) || card.items.some((item) => item.key.toLowerCase().includes(term)),
      )
    : [...cards];

  kept.sort((left, right) => {
    switch (sort) {
      case "name":
        return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
      case "size":
        return right.count - left.count || left.name.localeCompare(right.name, "en");
      default:
        return (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "") || left.name.localeCompare(right.name, "en");
    }
  });

  return reversed ? kept.reverse() : kept;
}
