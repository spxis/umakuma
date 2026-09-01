"use client";

import { useCallback, useMemo, useState } from "react";

import { getSessionJson, setSessionJson } from "@/lib/clientStorage";

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

type SelectionState = {
  choosing: boolean;
  chosen: Set<string>;
  /**
   * Where a range starts. Every plain click moves it, which is what makes
   * "click one, shift-click another" work the way it does in a file browser
   * or a mail client without anyone having to be told.
   */
  anchor: string | null;
};

/** What survives a page turn, and what it is stored under. */
type StoredSelection = { choosing: boolean; chosen: string[] };

const STORAGE_PREFIX = "wr:selection:";

/**
 * Choosing, kept for the sitting rather than for the component.
 *
 * Turning to page two is a navigation: the page remounts, and a selection held
 * in React state went with it - both the characters picked and the fact that
 * picking was happening at all. Choosing twenty characters across three pages
 * is the ordinary way to build a list, and it could not be done.
 *
 * The session is the right span. A half-built selection is a task somebody is
 * in the middle of, so it should survive a page turn and a stray reload, and
 * it should not be handed back next week from a tab opened for something else.
 *
 * @param surface Which surface's selection this is - the grade explorer's is
 * not the JLPT explorer's, and they must not overwrite one another.
 */
export function useSubjectSelection(surface: string): SubjectSelection {
  const storageKey = `${STORAGE_PREFIX}${surface}`;

  const [state, setState] = useState<SelectionState>(() => {
    const stored = getSessionJson<StoredSelection>(storageKey, { choosing: false, chosen: [] });
    return { choosing: stored.choosing, chosen: new Set(stored.chosen), anchor: null };
  });

  /*
   * One writer, so no action can forget to remember, and the write happens
   * here rather than inside a state updater - an updater may run twice, and it
   * is not where a side effect belongs.
   */
  const apply = useCallback(
    (next: SelectionState) => {
      setState(next);
      setSessionJson(storageKey, { choosing: next.choosing, chosen: [...next.chosen] });
    },
    [storageKey],
  );

  const toggle = useCallback(
    (key: string) => {
      const chosen = new Set(state.chosen);
      if (chosen.has(key)) {
        chosen.delete(key);
      } else if (chosen.size < SUBJECT_SELECTION_LIMIT) {
        chosen.add(key);
      }
      apply({ ...state, chosen, anchor: key });
    },
    [apply, state],
  );

  const extendTo = useCallback(
    (key: string, order: readonly string[]) => {
      const range = selectionRange(state.anchor, key, order);

      /*
       * Nothing anchored, or an anchor that has since scrolled off this page,
       * leaves nothing to measure against - so the click means what an
       * unmodified one means.
       */
      if (range.length === 0) {
        toggle(key);
        return;
      }

      const chosen = new Set(state.chosen);
      // Adds, never removes: a swept range that unpicked half of what it
      // crossed would be impossible to predict from where the sweep began.
      for (const item of range) {
        if (chosen.size >= SUBJECT_SELECTION_LIMIT) break;
        chosen.add(item);
      }
      /* The far end becomes the new anchor, so ranges can be walked outward. */
      apply({ ...state, chosen, anchor: key });
    },
    [apply, state, toggle],
  );

  const addAll = useCallback(
    (keys: string[]) => {
      const chosen = new Set(state.chosen);
      for (const key of keys) {
        if (chosen.size >= SUBJECT_SELECTION_LIMIT) break;
        chosen.add(key);
      }
      apply({ ...state, chosen });
    },
    [apply, state],
  );

  const clear = useCallback(() => {
    apply({ ...state, chosen: new Set(), anchor: null });
  }, [apply, state]);

  /*
   * Leaving picking mode drops the selection. Keeping it would mean a set the
   * member can no longer see or edit, which resurfaces later as a link holding
   * characters they do not remember choosing.
   */
  const cancel = useCallback(() => {
    apply({ choosing: false, chosen: new Set(), anchor: null });
  }, [apply]);

  const start = useCallback(() => {
    apply({ ...state, choosing: true });
  }, [apply, state]);

  return useMemo(
    () => ({
      choosing: state.choosing,
      chosen: state.chosen,
      count: state.chosen.size,
      atLimit: state.chosen.size >= SUBJECT_SELECTION_LIMIT,
      start,
      cancel,
      toggle,
      extendTo,
      addAll,
      clear,
    }),
    [addAll, cancel, clear, extendTo, start, state.choosing, state.chosen, toggle],
  );
}
