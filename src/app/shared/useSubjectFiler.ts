"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { STUDY_TAGS, type StudyTag } from "@/lib/domainConstants";
import {
  NO_TAGS,
  itemsAfterToggle,
  taggableIds,
  type FilerHit,
  type FilerList,
  type FilerTags,
} from "@/lib/subjectFiler";
import type { StudyListItemRef } from "@/lib/studyListRules";
import { getSessionItem, setSessionItem } from "@/lib/clientStorage";
import { updateStudyTag } from "@/app/users/[nickname]/study-explorer/lib/studyTagApi";

import { SUBJECT_FILER_COPY } from "./studyListCopy";

/*
 * Held for the sitting, not for ever.
 *
 * Filing is a task somebody is in the middle of - search ten kanji, keep each
 * one - so it should survive the next search and not the next week. Kept in
 * `localStorage` it stayed on for every later visit, and the search page came
 * up with a column of tag marks and a chip per list on every row, which was
 * unreadable for the many searches that are only looking something up.
 */
const FILER_OPEN_KEY = "umakuma:search-filer-open";

/*
 * One flag, held once. The box that widens and the list that shows the column
 * each read it, and each used to keep a copy: pressing the button opened the
 * column in the rows while the box stayed narrow, since nothing told it.
 * A store every reader subscribes to is the fix - flip it anywhere, and
 * everything showing it changes together.
 */
let filerOpen: boolean | null = null;
const listeners = new Set<() => void>();

function readFilerOpen(): boolean {
  if (filerOpen === null) filerOpen = getSessionItem(FILER_OPEN_KEY) === "1";
  return filerOpen;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether the filing column is open, shared by the box that widens and the list that shows it. */
export function useFilerOpen(): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  const open = useSyncExternalStore(subscribe, readFilerOpen, () => false);
  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(readFilerOpen()) : value;
    filerOpen = next;
    setSessionItem(FILER_OPEN_KEY, next ? "1" : "0");
    for (const listener of listeners) listener();
  }, []);
  return [open, setOpen];
}

export type SubjectFiler = {
  lists: FilerList[] | null;
  tagsFor: (hit: FilerHit) => FilerTags;
  toggleTag: (hit: FilerHit, tag: StudyTag) => void;
  toggleList: (hit: FilerHit, list: FilerList) => void;
  error: string | null;
};

/**
 * The member's lists and tags, brought to a set of result rows.
 *
 * Fetched only while the column is open and only for the rows on screen: a
 * dropdown that asked the tag store about every keystroke would be paying for
 * a column nobody had opened. Changes are written straight through and shown
 * at once; a failure puts the old state back and says so.
 */
export function useSubjectFiler(accountId: string | null, hits: FilerHit[], open: boolean): SubjectFiler {
  const [lists, setLists] = useState<FilerList[] | null>(null);
  const [tags, setTags] = useState<Map<number, FilerTags>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const active = open && Boolean(accountId);

  useEffect(() => {
    if (!active || lists !== null) return;
    let cancelled = false;
    void fetch(`/api/study/${accountId}/lists`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { lists?: FilerList[] };
        if (!cancelled) setLists(body.lists ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(SUBJECT_FILER_COPY.failed);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, active, lists]);

  /* One string, so the effect runs when the rows change and not when the array is rebuilt. */
  const wantedIds = useMemo(() => taggableIds(hits).join(","), [hits]);
  useEffect(() => {
    if (!active || !wantedIds) return;
    let cancelled = false;
    void fetch(`/api/study/${accountId}/tags?subjectIds=${wantedIds}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { tags?: Array<{ subjectId: number; favorite: boolean; trouble: boolean; burned?: boolean }> };
        if (cancelled) return;
        setTags((previous) => {
          const next = new Map(previous);
          for (const id of wantedIds.split(",").map(Number)) next.set(id, NO_TAGS);
          for (const row of body.tags ?? []) next.set(row.subjectId, { favorite: row.favorite, trouble: row.trouble, burned: row.burned ?? false });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setError(SUBJECT_FILER_COPY.failed);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, active, wantedIds]);

  const tagsFor = useCallback(
    (hit: FilerHit) => (typeof hit.subjectId === "number" ? tags.get(hit.subjectId) ?? NO_TAGS : NO_TAGS),
    [tags],
  );

  const toggleTag = useCallback(
    (hit: FilerHit, tag: StudyTag) => {
      if (!accountId || typeof hit.subjectId !== "number") return;
      const subjectId = hit.subjectId;
      const before = tags.get(subjectId) ?? NO_TAGS;
      const enabled = !before[tag];
      const after = { ...before, [tag]: enabled };
      setTags((previous) => new Map(previous).set(subjectId, after));
      setError(null);
      void updateStudyTag(accountId, subjectId, tag, enabled).then((saved) => {
        if (!saved) {
          setTags((previous) => new Map(previous).set(subjectId, before));
          setError(SUBJECT_FILER_COPY.failed);
          return;
        }
        window.dispatchEvent(new CustomEvent("wr:study-tags-updated", { detail: { accountId, subjectId } }));
      });
    },
    [accountId, tags],
  );

  const toggleList = useCallback(
    (hit: FilerHit, list: FilerList) => {
      if (!accountId) return;
      const items = itemsAfterToggle(list, hit);
      const swap = (value: StudyListItemRef[]) =>
        setLists((previous) => previous?.map((row) => (row.id === list.id ? { ...row, items: value } : row)) ?? previous);
      swap(items);
      setError(null);
      void fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: list.id, items }),
      })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
        })
        .catch(() => {
          swap(list.items);
          setError(SUBJECT_FILER_COPY.failed);
        });
    },
    [accountId],
  );

  return { lists, tagsFor, toggleTag, toggleList, error };
}

export { STUDY_TAGS };
