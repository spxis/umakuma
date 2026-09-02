"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getStoredFlagOneIsTrue, setStoredBooleanFlag } from "@/lib/clientStorage";

/**
 * Whether the Burned list is applied: taken out of every list being read.
 *
 * One flag, held once and remembered per browser, the way the filing column
 * is. Every surface that lists subjects reads it, so a member who hides what
 * they know on one page does not find it back on the next.
 */
const HIDE_BURNED_KEY = "umakuma:hide-burned";

let hideBurned: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (hideBurned === null) hideBurned = getStoredFlagOneIsTrue(HIDE_BURNED_KEY, false);
  return hideBurned;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHideBurned(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => {
    hideBurned = next;
    setStoredBooleanFlag(HIDE_BURNED_KEY, next);
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}
