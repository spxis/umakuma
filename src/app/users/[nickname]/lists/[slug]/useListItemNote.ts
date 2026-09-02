"use client";

import { useCallback, useState } from "react";

import { STUDY_TAG_LIST_COPY } from "@/app/shared/studyTagListsUi";
import type { ListPageItem } from "@/lib/listPageItems";

/**
 * The note being written, and what has been written so far.
 *
 * The page keeps its own map of saved notes rather than reloading the list: a
 * note is a one-field write and a round trip to redraw the whole list after it
 * would lose the reader's place, their filter and their scroll position.
 *
 * Keyed by kind and key rather than by subject id, because a list may hold an
 * item the catalogue never named and those carry a stand-in id that means
 * nothing outside the page it was drawn on.
 */
export type ListItemNotes = {
  open: ListPageItem | null;
  saving: boolean;
  error: string | null;
  noteFor: (item: { listKind: string; listKey: string; note: string | null }) => string | null;
  edit: (item: ListPageItem) => void;
  close: () => void;
  save: (note: string) => Promise<void>;
};

function noteKey(item: { listKind: string; listKey: string }): string {
  return `${item.listKind}:${item.listKey}`;
}

export function useListItemNote(accountId: string | null, listId: string): ListItemNotes {
  const [open, setOpen] = useState<ListPageItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [written, setWritten] = useState<Record<string, string | null>>({});

  const noteFor = useCallback(
    (item: { listKind: string; listKey: string; note: string | null }) => {
      const key = noteKey(item);
      return key in written ? written[key]! : item.note;
    },
    [written],
  );

  const save = useCallback(
    async (note: string) => {
      if (!accountId || !open) return;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/study/${accountId}/lists/${listId}/items`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: open.listKind, key: open.listKey, note }),
        });
        if (!response.ok) {
          setError(STUDY_TAG_LIST_COPY.noteFailed);
          return;
        }
        const body = (await response.json().catch(() => null)) as { note?: string | null } | null;
        setWritten((current) => ({ ...current, [noteKey(open)]: body?.note ?? null }));
        setOpen(null);
      } catch {
        setError(STUDY_TAG_LIST_COPY.noteFailed);
      } finally {
        setSaving(false);
      }
    },
    [accountId, listId, open],
  );

  return {
    open,
    saving,
    error,
    noteFor,
    edit: (item) => {
      setError(null);
      setOpen(item);
    },
    close: () => setOpen(null),
    save,
  };
}
