"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

import {
  DEFAULT_THEME_WORD_MODE,
  THEME_WORDS_STORAGE_KEY,
  THEME_WORD_MODE_VALUES,
  type ThemeWordMode,
} from "./themeWords";

/**
 * Which script every theme rung on every surface is being read in.
 *
 * Held in a module rather than a context, the way `usePillWords` is: the
 * ladder is drawn on the settings page, on the theme's own page and inside the
 * browse modal, which are three unrelated trees, and the modal's copy has to
 * redraw when the control behind it is pressed.
 */
let mode: ThemeWordMode | null = null;
const listeners = new Set<() => void>();

function read(): ThemeWordMode {
  mode ??= getStoredEnum(THEME_WORDS_STORAGE_KEY, THEME_WORD_MODE_VALUES, DEFAULT_THEME_WORD_MODE);
  return mode;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemeWords(): [ThemeWordMode, (value: ThemeWordMode) => void] {
  /* The server cannot know what this browser stored, so it renders the default. */
  const value = useSyncExternalStore(subscribe, read, () => DEFAULT_THEME_WORD_MODE);
  const set = useCallback((next: ThemeWordMode) => {
    mode = next;
    setStoredEnum(THEME_WORDS_STORAGE_KEY, next);
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}
