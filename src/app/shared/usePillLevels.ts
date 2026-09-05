"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

import {
  DEFAULT_PILL_LEVEL_MODE,
  PILL_LEVELS_STORAGE_KEY,
  PILL_LEVEL_MODE_VALUES,
  type PillLevelMode,
} from "./pillWords";

/*
 * Whether item chips carry their levels. Held the way `usePillWords` is held -
 * in a module, per browser - and for the same reason: the chips sit under a
 * dozen unrelated trees, and the choice is about how a member reads, not
 * about the section in front of them.
 */
let mode: PillLevelMode | null = null;
const listeners = new Set<() => void>();

function read(): PillLevelMode {
  mode ??= getStoredEnum(PILL_LEVELS_STORAGE_KEY, PILL_LEVEL_MODE_VALUES, DEFAULT_PILL_LEVEL_MODE);
  return mode;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePillLevels(): [PillLevelMode, (value: PillLevelMode) => void] {
  const value = useSyncExternalStore(subscribe, read, () => DEFAULT_PILL_LEVEL_MODE);
  const set = useCallback((next: PillLevelMode) => {
    mode = next;
    setStoredEnum(PILL_LEVELS_STORAGE_KEY, next);
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}
