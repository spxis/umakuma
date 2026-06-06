import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

type CustomLibraryItemRow = {
  id: string;
  type: "kanji" | "vocabulary" | "phrase";
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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);

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

  const items = data?.items ?? [];

  useEffect(() => {
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
      setMessage(`Deleted ${deletedCount} item${deletedCount === 1 ? "" : "s"}.`);
      setSelectedItemIds([]);
      await Promise.all([mutate(), onLibrariesChanged()]);
    } catch (error) {
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

      setSelectedItemIds([]);
      setMessage("Library deleted.");
      await onLibrariesChanged();
      onLibraryDeleted(body.fallbackActiveLibraryId ?? null);
    } catch (error) {
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
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library items ({items.length})</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedItemIds(items.map((item) => item.id))}
            disabled={isLoading || items.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Select all
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
              void deleteSelectedItems();
            }}
            disabled={isDeletingItems || selectedItemIds.length === 0}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeletingItems ? "Deleting..." : `Delete selected (${selectedItemIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              void deleteLibrary();
            }}
            disabled={isDeletingLibrary}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            title={libraryName ? `Delete ${libraryName}` : "Delete library"}
          >
            {isDeletingLibrary ? "Deleting..." : "Delete library"}
          </button>
        </div>
      </div>

      <div className="max-h-60 overflow-auto rounded-lg border border-line bg-surface">
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-foreground/65">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-foreground/65">No items in this library.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const isSelected = selectedItemIds.includes(item.id);
              return (
                <li key={item.id} className="px-3 py-2">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 h-4 w-4 rounded border-line"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{item.characters}</span>
                        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/70">{item.type}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/60">L{item.level}</span>
                      </div>
                      <p className="truncate text-foreground/70">{item.meanings[0] ?? "No meaning"}</p>
                      {item.primaryReading ? <p className="truncate text-foreground/60">{item.primaryReading}</p> : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {message ? <p className="text-xs text-foreground/70">{message}</p> : null}
    </div>
  );
}
