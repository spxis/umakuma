import type { ShelfFacts } from "@/lib/listShelfOrder";

import type { ListCard } from "./StudyList.types";

/**
 * What a saved list is, to a shelf that is sorting and searching.
 *
 * The ordering itself is shared - three shelves hold lists and each carried a
 * different row type - so each shelf supplies this reading instead. Searching
 * reaches the items as well as the name, because a member who remembers the
 * kanji but not what they called the list found nothing otherwise.
 */
export function listCardFacts(card: ListCard): ShelfFacts {
  return {
    name: card.name,
    count: card.count,
    updatedAt: card.updatedAt,
    searchable: card.items.map((item) => item.key),
  };
}
