"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

import {
  DEFAULT_PILL_WORD_MODE,
  PILL_WORDS_STORAGE_KEY,
  PILL_WORD_MODE_VALUES,
  type PillWordMode,
} from "./pillWords";

/**
 * Which words every item chip on every page is carrying.
 *
 * The chips that stand for a kanji or a word turn up all over - the words a
 * kanji is used in, the parts of a character, the related groups, the kanji of
 * a place name, a paste being turned into a list - and they had drifted: some
 * carried the reading and the meaning, some carried the glyph alone. One
 * preference, held once and remembered per browser, so a member who wants
 * readings gets readings everywhere, and a member who wants a dense wall of
 * glyphs gets that instead.
 *
 * Held in a module rather than a context because the chips are mounted under
 * a dozen unrelated trees, several of them server-rendered above the client
 * boundary, and a provider would have to be threaded through every one.
 */
let mode: PillWordMode | null = null;
const listeners = new Set<() => void>();

function read(): PillWordMode {
  mode ??= getStoredEnum(PILL_WORDS_STORAGE_KEY, PILL_WORD_MODE_VALUES, DEFAULT_PILL_WORD_MODE);
  return mode;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePillWords(): [PillWordMode, (value: PillWordMode) => void] {
  /* The server cannot know what this browser stored, so it renders the default. */
  const value = useSyncExternalStore(subscribe, read, () => DEFAULT_PILL_WORD_MODE);
  const set = useCallback((next: PillWordMode) => {
    mode = next;
    setStoredEnum(PILL_WORDS_STORAGE_KEY, next);
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}
