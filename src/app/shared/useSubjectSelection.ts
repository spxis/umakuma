"use client";

import { useCallback, useMemo, useState } from "react";

import { SUBJECT_SELECTION_LIMIT } from "./subjectSelection";

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
  /** Adds what is on screen now, stopping at the limit. */
  addAll: (keys: string[]) => void;
  clear: () => void;
};

export function useSubjectSelection(): SubjectSelection {
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((key: string) => {
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

  const clear = useCallback(() => setChosen(new Set()), []);

  /*
   * Leaving picking mode drops the selection. Keeping it would mean a set the
   * member can no longer see or edit, which resurfaces later as a link holding
   * characters they do not remember choosing.
   */
  const cancel = useCallback(() => {
    setChoosing(false);
    setChosen(new Set());
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
      addAll,
      clear,
    }),
    [choosing, chosen, start, cancel, toggle, addAll, clear],
  );
}
