import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import ExplorerConfirmDialog from "./shared/ExplorerConfirmDialog";
import { shortSubjectTypeLabel, subjectTypePillClass } from "./level-explorer/lib/levelExplorerDisplay";

type CustomLibraryItemRow = {
  id: string;
  type: "radical" | "kanji" | "vocabulary";
  level: number;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReading: string | null;
};

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
  const availableLevels = useMemo(
    () => Array.from(new Set(items.map((item) => item.level))).sort((a, b) => a - b),
    [items],
  );
  const filteredItems = useMemo(
    () => (levelFilter === "all" ? items : items.filter((item) => item.level === levelFilter)),
    [items, levelFilter],
  );
  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));
  const selectedItemDetails = selectedItems
    .slice(0, 12)
    .map((item) => `${item.characters} (${shortSubjectTypeLabel(item.type)}, L${item.level})`);
  const selectedItemOverflow = selectedItems.length > selectedItemDetails.length
    ? selectedItems.length - selectedItemDetails.length
    : 0;
  const deleteItemDetails = selectedItemOverflow > 0
    ? [...selectedItemDetails, `+${selectedItemOverflow} more item${selectedItemOverflow === 1 ? "" : "s"}`]
    : selectedItemDetails;

  useEffect(() => {
    setLevelFilter("all");
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library items ({filteredItems.length}/{items.length})</p>
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
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedItemIds(filteredItems.map((item) => item.id))}
            disabled={isLoading || filteredItems.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Select visible
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

      <div className="max-h-72 overflow-auto rounded-lg border border-line bg-surface">
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-foreground/65">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-foreground/65">No items in this library.</p>
        ) : filteredItems.length === 0 ? (
          <p className="px-3 py-2 text-xs text-foreground/65">No items at this level.</p>
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
              {filteredItems.map((item) => {
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
