"use client";

import { useSyncExternalStore } from "react";

import { getStoredJson, setStoredJson } from "@/lib/clientStorage";

/**
 * Which months of the release list a reader has left open.
 *
 * The page printed every month at full length, so it opened on a wall of a
 * hundred entries and the month somebody came for was a long scroll away. Each
 * month folds now: the one you are in is open, the rest are shut, and any of
 * them can be opened by hand.
 *
 * Remembered per device, because a reader who opens August to read it and then
 * follows a link back does not want August shut again.
 *
 * Through a store rather than into state after mount, so the server's markup
 * and the first client render agree: `null` means nothing has been stored and
 * the defaults apply, which is exactly what the server renders. React swaps in
 * the stored answer on hydration without the markup ever disagreeing.
 */
const STORAGE_KEY = "umakuma:releases-open-months";

const listeners = new Set<() => void>();

/** Cached so the snapshot is the same reference until something changes it. */
let snapshot: readonly string[] | null = null;
let read = false;

function currentSnapshot(): readonly string[] | null {
  if (!read) {
    const stored = getStoredJson<string[] | null>(STORAGE_KEY, null);
    snapshot = Array.isArray(stored) ? stored.filter((key) => typeof key === "string") : null;
    read = true;
  }
  return snapshot;
}

/** Nothing is stored on a server, so the defaults are what it draws. */
function serverSnapshot(): readonly string[] | null {
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The months held open, or null while the reader has chosen nothing. */
export function useOpenMonths(): readonly string[] | null {
  return useSyncExternalStore(subscribe, currentSnapshot, serverSnapshot);
}

export function setOpenMonths(keys: readonly string[]): void {
  snapshot = [...keys];
  read = true;
  setStoredJson(STORAGE_KEY, snapshot);
  for (const listener of listeners) listener();
}

/**
 * Whether a month is open: what the reader chose, or the month they are in.
 *
 * Pure, and exported for its own test - the fallback is the part with a rule
 * in it, and it is the difference between a page that opens on the current
 * month and one that opens on nothing at all.
 */
export function monthIsOpen(
  key: string,
  open: readonly string[] | null,
  currentKey: string,
): boolean {
  return open ? open.includes(key) : key === currentKey;
}

/** The list after one month is toggled, starting from whatever is showing now. */
export function monthsAfterToggle(
  key: string,
  open: readonly string[] | null,
  currentKey: string,
  everyKey: readonly string[],
): string[] {
  const showing = everyKey.filter((month) => monthIsOpen(month, open, currentKey));
  return showing.includes(key) ? showing.filter((month) => month !== key) : [...showing, key];
}
