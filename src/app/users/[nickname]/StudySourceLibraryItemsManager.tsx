import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import ExplorerConfirmDialog from "./shared/ExplorerConfirmDialog";
import { shortSubjectTypeLabel, subjectTypePillClass } from "./level-explorer/lib/levelExplorerDisplay";
import {
  getLocalStorageItem,
  getStoredEnum,
  getStoredPositiveInt,
  setLocalStorageItem,
  setStoredEnum,
} from "@/lib/clientStorage";
import {
  buildDeleteItemDetails,
  buildPreferenceStorageKeys,
  computeLibraryTypeCounts,
  filterAndSortLibraryItems,
  isValidLibraryItemsPageSize,
  PAGE_SIZE_OPTIONS,
  SORT_ORDER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  type CustomLibraryItemRow,
  type LibraryItemTypeFilter,
  type LibrarySortOrder,
} from "./StudySourceLibraryItemsManager.lib";

type Props = {
  accountId: string;
  libraryId: string | null;
  libraryName: string | null;
  onLibrariesChanged: () => Promise<unknown>;
  onLibraryDeleted: (fallbackActiveLibraryId: string | null) => void;
};

export default function StudySourceLibraryItemsManager({
  accountId,
  libraryId,
  libraryName,
  onLibrariesChanged,
  onLibraryDeleted,
}: Props) {
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<LibraryItemTypeFilter>("all");
  const [sortOrder, setSortOrder] = useState<LibrarySortOrder>("level-asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasHydratedPreferences, setHasHydratedPreferences] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);
  const [deleteItemsConfirmOpen, setDeleteItemsConfirmOpen] = useState(false);
  const [deleteLibraryConfirmOpen, setDeleteLibraryConfirmOpen] = useState(false);

  const itemsPath = useMemo(
    () => (libraryId ? `/api/custom-study/${accountId}/libraries/items?libraryId=${encodeURIComponent(libraryId)}` : null),
    [accountId, libraryId],
  );

  const { data, mutate, isLoading } = useSWR<{ items: CustomLibraryItemRow[] }>(
    itemsPath,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const body = (await response.json()) as { items?: CustomLibraryItemRow[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not load library items.");
      }

      return { items: body.items ?? [] };
    },
    { revalidateOnFocus: true },
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const preferenceStorageKeys = useMemo(
    () => buildPreferenceStorageKeys(accountId),
    [accountId],
  );

  useEffect(() => {
    const storedTypeFilter = getStoredEnum(preferenceStorageKeys.typeFilter, TYPE_FILTER_OPTIONS, "all");
    const storedSortOrder = getStoredEnum(preferenceStorageKeys.sortOrder, SORT_ORDER_OPTIONS, "level-asc");
    const storedPageSize = getStoredPositiveInt(preferenceStorageKeys.pageSize);
    const storedSearchQuery = getLocalStorageItem(preferenceStorageKeys.searchQuery) ?? "";

    setTypeFilter(storedTypeFilter);
    setSortOrder(storedSortOrder);
    if (storedPageSize && isValidLibraryItemsPageSize(storedPageSize)) {
      setPageSize(storedPageSize);
    }
    setSearchQuery(storedSearchQuery);
    setHasHydratedPreferences(true);
  }, [preferenceStorageKeys]);

  useEffect(() => {
    if (!hasHydratedPreferences) {
      return;
    }
    setStoredEnum(preferenceStorageKeys.typeFilter, typeFilter);
  }, [hasHydratedPreferences, preferenceStorageKeys.typeFilter, typeFilter]);

  useEffect(() => {
    if (!hasHydratedPreferences) {
      return;
    }
    setStoredEnum(preferenceStorageKeys.sortOrder, sortOrder);
  }, [hasHydratedPreferences, preferenceStorageKeys.sortOrder, sortOrder]);

  useEffect(() => {
    if (!hasHydratedPreferences) {
      return;
    }
    setLocalStorageItem(preferenceStorageKeys.pageSize, String(pageSize));
  }, [hasHydratedPreferences, preferenceStorageKeys.pageSize, pageSize]);

  useEffect(() => {
    if (!hasHydratedPreferences) {
      return;
    }
    setLocalStorageItem(preferenceStorageKeys.searchQuery, searchQuery);
  }, [hasHydratedPreferences, preferenceStorageKeys.searchQuery, searchQuery]);

  const availableLevels = useMemo(
    () => Array.from(new Set(items.map((item) => item.level))).sort((a, b) => a - b),
    [items],
  );
  const typeCounts = useMemo(() => computeLibraryTypeCounts(items), [items]);

  const filteredItems = useMemo(
    () => filterAndSortLibraryItems({ items, levelFilter, typeFilter, sortOrder, searchQuery }),
    [items, levelFilter, typeFilter, sortOrder, searchQuery],
  );

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [levelFilter, typeFilter, searchQuery, sortOrder, pageSize]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [currentPage, filteredItems, pageSize]);

  const pageStartIndex = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEndIndex = Math.min(filteredItems.length, currentPage * pageSize);

  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));
  const deleteItemDetails = useMemo(() => buildDeleteItemDetails(selectedItems), [selectedItems]);

  useEffect(() => {
    setLevelFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
    setSelectedItemIds([]);
    setMessage(null);
  }, [libraryId]);

  function toggleItem(itemId: string): void {
    setSelectedItemIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((value) => value !== itemId);
      }

      return [...current, itemId];
    });
  }

  async function deleteSelectedItems(): Promise<void> {
    if (!libraryId || selectedItemIds.length === 0) {
      return;
    }

    setIsDeletingItems(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/custom-study/${accountId}/libraries/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryId,
          itemIds: selectedItemIds,
        }),
      });
      const body = (await response.json()) as { error?: string; deletedCount?: number };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not delete library items.");
      }

      const deletedCount = body.deletedCount ?? 0;
      setDeleteItemsConfirmOpen(false);
      setMessage(`Deleted ${deletedCount} item${deletedCount === 1 ? "" : "s"}.`);
      setSelectedItemIds([]);
      await Promise.all([mutate(), onLibrariesChanged()]);
    } catch (error) {
      setDeleteItemsConfirmOpen(false);
      setMessage(error instanceof Error ? error.message : "Could not delete library items.");
    } finally {
      setIsDeletingItems(false);
    }
  }

  async function deleteLibrary(): Promise<void> {
    if (!libraryId) {
      return;
    }

    setIsDeletingLibrary(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/custom-study/${accountId}/libraries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId }),
      });
      const body = (await response.json()) as { error?: string; fallbackActiveLibraryId?: string | null };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not delete custom library.");
      }

      setDeleteLibraryConfirmOpen(false);
      setSelectedItemIds([]);
      setMessage("Library deleted.");
      await onLibrariesChanged();
      onLibraryDeleted(body.fallbackActiveLibraryId ?? null);
    } catch (error) {
      setDeleteLibraryConfirmOpen(false);
      setMessage(error instanceof Error ? error.message : "Could not delete custom library.");
    } finally {
      setIsDeletingLibrary(false);
    }
  }

  if (!libraryId) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library items ({filteredItems.length}/{items.length})</p>
          <p className="text-[11px] font-semibold text-foreground/60">Rad {typeCounts.radical} · Kanji {typeCounts.kanji} · Vocab {typeCounts.vocabulary}</p>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/70">
            <span>Level</span>
            <select
              value={String(levelFilter)}
              onChange={(event) => {
                const next = event.target.value;
                setLevelFilter(next === "all" ? "all" : Number(next));
              }}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-foreground"
            >
              <option value="all">All levels</option>
              {availableLevels.map((level) => (
                <option key={level} value={String(level)}>L{level}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/70">
            <span>Type</span>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as LibraryItemTypeFilter);
              }}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-foreground"
            >
              <option value="all">All types</option>
              <option value="radical">Radicals</option>
              <option value="kanji">Kanji</option>
              <option value="vocabulary">Vocabulary</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/70">
            <span>Sort</span>
            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as LibrarySortOrder);
              }}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-foreground"
            >
              <option value="level-asc">Level asc</option>
              <option value="level-desc">Level desc</option>
            </select>
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            placeholder="Search term, meaning, reading"
            className="h-8 min-w-46 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedItemIds(pagedItems.map((item) => item.id))}
            disabled={isLoading || pagedItems.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Select page
          </button>
          <button
            type="button"
            onClick={() => setSelectedItemIds(filteredItems.map((item) => item.id))}
            disabled={isLoading || filteredItems.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Select filtered
          </button>
          <button
            type="button"
            onClick={() => setSelectedItemIds([])}
            disabled={selectedItemIds.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteItemsConfirmOpen(true);
            }}
            disabled={isDeletingItems || selectedItemIds.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeletingItems ? "Deleting..." : `Delete selected (${selectedItemIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteLibraryConfirmOpen(true);
            }}
            disabled={isDeletingLibrary}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            title={libraryName ? `Delete ${libraryName}` : "Delete library"}
          >
            {isDeletingLibrary ? "Deleting..." : "Delete library"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-black/[0.02] px-2 py-1.5">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-foreground/70">
          <span>Showing {pageStartIndex}-{pageEndIndex} of {filteredItems.length}</span>
          <label className="inline-flex items-center gap-1">
            <span>Rows</span>
            <select
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
              }}
              className="h-7 rounded-md border border-line bg-surface px-1.5 text-[11px] font-semibold text-foreground"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={String(size)}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Prev
          </button>
          <span className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">Page {currentPage}/{pageCount}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            disabled={currentPage >= pageCount}
            className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(pageCount)}
            disabled={currentPage >= pageCount}
            className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Last
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border border-line bg-surface">
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-foreground/65">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-foreground/65">No items in this library.</p>
        ) : filteredItems.length === 0 ? (
          <p className="px-3 py-2 text-xs text-foreground/65">No items match this filter.</p>
        ) : (
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-1 bg-surface-muted/95 backdrop-blur">
              <tr>
                <th scope="col" className="w-10 border-b border-line px-2 py-2 text-left font-bold uppercase tracking-[0.08em] text-foreground/70">Sel</th>
                <th scope="col" className="w-14 border-b border-line px-2 py-2 text-left font-bold uppercase tracking-[0.08em] text-foreground/70">Level</th>
                <th scope="col" className="border-b border-line px-2 py-2 text-left font-bold uppercase tracking-[0.08em] text-foreground/70">Term</th>
                <th scope="col" className="border-b border-line px-2 py-2 text-left font-bold uppercase tracking-[0.08em] text-foreground/70">Meaning</th>
                <th scope="col" className="border-b border-line px-2 py-2 text-left font-bold uppercase tracking-[0.08em] text-foreground/70">Reading</th>
                <th scope="col" className="w-26 border-b border-line px-2 py-2 text-left font-bold uppercase tracking-[0.08em] text-foreground/70">Type</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const displayMeaning = item.meanings.length > 0 ? item.meanings.join(", ") : "No meaning";
                const displayReading = item.primaryReading ?? item.readings[0] ?? "-";
                return (
                  <tr key={item.id} className="odd:bg-surface even:bg-black/[0.02]">
                    <td className="border-b border-line px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-line"
                        aria-label={`Select ${item.characters}`}
                      />
                    </td>
                    <td className="border-b border-line px-2 py-2 align-top text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/70">L{item.level}</td>
                    <td className="max-w-42 border-b border-line px-2 py-2 align-top font-semibold text-foreground" title={item.characters}>{item.characters}</td>
                    <td className="max-w-56 border-b border-line px-2 py-2 align-top text-foreground/80" title={displayMeaning}>{displayMeaning}</td>
                    <td className="max-w-44 border-b border-line px-2 py-2 align-top text-foreground/75" title={displayReading}>{displayReading}</td>
                    <td className="border-b border-line px-2 py-2 align-top">
                      <span className={`${subjectTypePillClass(item.type)} inline-flex`}>{shortSubjectTypeLabel(item.type)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {message ? <p className="text-xs text-foreground/70">{message}</p> : null}

      <ExplorerConfirmDialog
        open={deleteItemsConfirmOpen}
        title={`Delete ${selectedItemIds.length} selected item${selectedItemIds.length === 1 ? "" : "s"}?`}
        description="This removes the selected items from this library."
        confirmLabel="Delete selected"
        cancelLabel="Cancel"
        details={deleteItemDetails}
        detailsTitle="Items to delete"
        overlayZIndexClass="z-10030"
        busy={isDeletingItems}
        onCancel={() => setDeleteItemsConfirmOpen(false)}
        onConfirm={() => {
          void deleteSelectedItems();
        }}
      />

      <ExplorerConfirmDialog
        open={deleteLibraryConfirmOpen}
        title="Delete library?"
        description={`This permanently removes ${libraryName ?? "this library"} and all of its items.`}
        confirmLabel="Delete library"
        cancelLabel="Keep library"
        overlayZIndexClass="z-10030"
        busy={isDeletingLibrary}
        onCancel={() => setDeleteLibraryConfirmOpen(false)}
        onConfirm={() => {
          void deleteLibrary();
        }}
      />
    </div>
  );
}
