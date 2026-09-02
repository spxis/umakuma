"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getStoredFlagOneIsTrue, setStoredBooleanFlag } from "@/lib/clientStorage";

/**
 * Whether an item pill carries its text as well as its glyph.
 *
 * The pills that stand for a kanji or a word turn up all over - the words a
 * kanji is used in, the related groups on a subject page, a paste being
 * turned into a list, a list being edited - and they had drifted: some
 * carried the reading and the meaning, some carried the glyph alone. One
 * preference, held once and remembered per browser, so a member who wants
 * the words spelled out gets them everywhere, and a member who wants a
 * dense wall of glyphs gets that instead.
 *
 * On by default: a learner reading a page is better served by being told
 * what a character is than by having to hover it.
 */
const PILL_TEXT_KEY = "umakuma:pill-text";

let showText: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (showText === null) showText = getStoredFlagOneIsTrue(PILL_TEXT_KEY, true);
  return showText;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePillText(): [boolean, (value: boolean) => void] {
  /* The server cannot know what this browser stored, so it renders the default. */
  const value = useSyncExternalStore(subscribe, read, () => true);
  const set = useCallback((next: boolean) => {
    showText = next;
    setStoredBooleanFlag(PILL_TEXT_KEY, next);
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}
