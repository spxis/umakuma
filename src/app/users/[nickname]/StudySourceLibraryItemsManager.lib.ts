import { shortSubjectTypeLabel } from "./level-explorer/lib/levelExplorerDisplay";

export type CustomLibraryItemRow = {
  id: string;
  type: "radical" | "kanji" | "vocabulary";
  level: number;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReading: string | null;
};

export type LibraryItemTypeFilter = "all" | CustomLibraryItemRow["type"];
export type LibrarySortOrder = "level-asc" | "level-desc";

export const TYPE_FILTER_OPTIONS: readonly LibraryItemTypeFilter[] = ["all", "radical", "kanji", "vocabulary"];
export const SORT_ORDER_OPTIONS: readonly LibrarySortOrder[] = ["level-asc", "level-desc"];
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const typeRank: Record<CustomLibraryItemRow["type"], number> = {
  radical: 0,
  kanji: 1,
  vocabulary: 2,
};

export function buildPreferenceStorageKeys(accountId: string): {
  typeFilter: string;
  sortOrder: string;
  pageSize: string;
  searchQuery: string;
} {
  return {
    typeFilter: `wr:user:${accountId}:library-items:type-filter`,
    sortOrder: `wr:user:${accountId}:library-items:sort-order`,
    pageSize: `wr:user:${accountId}:library-items:page-size`,
    searchQuery: `wr:user:${accountId}:library-items:search`,
  };
}

export function isValidLibraryItemsPageSize(value: number): boolean {
  return PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number]);
}

export function computeLibraryTypeCounts(items: CustomLibraryItemRow[]): {
  all: number;
  radical: number;
  kanji: number;
  vocabulary: number;
} {
  let radical = 0;
  let kanji = 0;
  let vocabulary = 0;
  for (const item of items) {
    if (item.type === "radical") radical += 1;
    if (item.type === "kanji") kanji += 1;
    if (item.type === "vocabulary") vocabulary += 1;
  }
  return {
    all: items.length,
    radical,
    kanji,
    vocabulary,
  };
}

export function filterAndSortLibraryItems({
  items,
  levelFilter,
  typeFilter,
  sortOrder,
  searchQuery,
}: {
  items: CustomLibraryItemRow[];
  levelFilter: number | "all";
  typeFilter: LibraryItemTypeFilter;
  sortOrder: LibrarySortOrder;
  searchQuery: string;
}): CustomLibraryItemRow[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const byLevel = levelFilter === "all" ? items : items.filter((item) => item.level === levelFilter);
  const byType = typeFilter === "all" ? byLevel : byLevel.filter((item) => item.type === typeFilter);
  const bySearch = !normalizedSearch
    ? byType
    : byType.filter((item) => {
        const meaningJoined = item.meanings.join(" ").toLowerCase();
        const readingJoined = item.readings.join(" ").toLowerCase();
        const characters = item.characters.toLowerCase();
        return (
          characters.includes(normalizedSearch)
          || meaningJoined.includes(normalizedSearch)
          || readingJoined.includes(normalizedSearch)
        );
      });

  const direction = sortOrder === "level-asc" ? 1 : -1;
  return [...bySearch].sort((a, b) => {
    if (a.level !== b.level) {
      return (a.level - b.level) * direction;
    }
    if (a.type !== b.type) {
      return typeRank[a.type] - typeRank[b.type];
    }
    return a.characters.localeCompare(b.characters);
  });
}

export function buildDeleteItemDetails(selectedItems: CustomLibraryItemRow[]): string[] {
  const selectedItemDetails = selectedItems
    .slice(0, 12)
    .map((item) => `${item.characters} (${shortSubjectTypeLabel(item.type)}, L${item.level})`);
  const selectedItemOverflow = selectedItems.length > selectedItemDetails.length
    ? selectedItems.length - selectedItemDetails.length
    : 0;

  return selectedItemOverflow > 0
    ? [...selectedItemDetails, `+${selectedItemOverflow} more item${selectedItemOverflow === 1 ? "" : "s"}`]
    : selectedItemDetails;
}
