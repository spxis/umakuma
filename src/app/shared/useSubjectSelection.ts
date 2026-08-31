"use client";

import { useCallback, useMemo, useState } from "react";

import { SUBJECT_SELECTION_LIMIT, selectionRange } from "./subjectSelection";

/**
 * The state behind choosing items on a subject surface.
 *
 * Selection is off until asked for. A grid that is always in a picking mode
 * puts a checkbox on every card of every explorer, which is clutter for the
 * many visits that are just browsing - and it steals the click that opens a
 * character's details, which is what selecting a card has always meant here.
 */
export type SubjectSelection = {
  /** Whether the surface is currently in choosing mode. */
  choosing: boolean;
  chosen: ReadonlySet<string>;
  count: number;
  atLimit: boolean;
  start: () => void;
  cancel: () => void;
  toggle: (key: string) => void;
  /**
   * Chooses everything between the last click and this one.
   *
   * `order` is the keys as they are laid out on screen, which the surface
   * knows and this hook does not - a grid's range is what the eye sweeps
   * across, so it has to follow the visible order rather than any underlying
   * one. With nothing clicked yet there is no range, and this is a toggle.
   */
  extendTo: (key: string, order: readonly string[]) => void;
  /** Adds what is on screen now, stopping at the limit. */
  addAll: (keys: string[]) => void;
  clear: () => void;
};

export function useSubjectSelection(): SubjectSelection {
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  /*
   * Where a range starts. Every plain click moves it, which is what makes
   * "click one, shift-click another" work the way it does in a file browser
   * or a mail client without anyone having to be told.
   */
  const [anchor, setAnchor] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setAnchor(key);
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < SUBJECT_SELECTION_LIMIT) {
        next.add(key);
      }
      return next;
    });
  }, []);

  const extendTo = useCallback(
    (key: string, order: readonly string[]) => {
      const range = selectionRange(anchor, key, order);

      /*
       * Nothing anchored, or an anchor that has since scrolled off this page,
       * leaves nothing to measure against - so the click means what an
       * unmodified one means.
       */
      if (range.length === 0) {
        toggle(key);
        return;
      }

      setChosen((prev) => {
        const next = new Set(prev);
        // Adds, never removes: a swept range that unpicked half of what it
        // crossed would be impossible to predict from where the sweep began.
        for (const item of range) {
          if (next.size >= SUBJECT_SELECTION_LIMIT) break;
          next.add(item);
        }
        return next;
      });
      /* The far end becomes the new anchor, so ranges can be walked outward. */
      setAnchor(key);
    },
    [anchor, toggle],
  );

  const addAll = useCallback((keys: string[]) => {
    setChosen((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (next.size >= SUBJECT_SELECTION_LIMIT) break;
        next.add(key);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setChosen(new Set());
    setAnchor(null);
  }, []);

  /*
   * Leaving picking mode drops the selection. Keeping it would mean a set the
   * member can no longer see or edit, which resurfaces later as a link holding
   * characters they do not remember choosing.
   */
  const cancel = useCallback(() => {
    setChoosing(false);
    setChosen(new Set());
    setAnchor(null);
  }, []);

  const start = useCallback(() => setChoosing(true), []);

  return useMemo(
    () => ({
      choosing,
      chosen,
      count: chosen.size,
      atLimit: chosen.size >= SUBJECT_SELECTION_LIMIT,
      start,
      cancel,
      toggle,
      extendTo,
      addAll,
      clear,
    }),
    [choosing, chosen, start, cancel, toggle, extendTo, addAll, clear],
  );
}
