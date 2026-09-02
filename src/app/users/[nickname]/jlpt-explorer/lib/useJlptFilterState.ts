"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import type { JlptFilter } from "../components/JlptExplorerContent.types";
import {
  defaultJlptLevels,
  readJlptFilterAddress,
  writeJlptFilterAddress,
  type JlptFilterState,
  type LevelOrNone,
} from "./jlptExplorerAddress";

/**
 * The JLPT explorer's filters: remembered per browser, said in the address.
 *
 * Two stores, one order. The browser's memory is read first, so the explorer
 * opens as it was last left; then the address, which wins wherever it says
 * something, so a link to N5 opens on N5 whatever the last visit chose. From
 * then on every change is written to both - storage so the next visit
 * remembers, the address so this view can be copied, and the back button
 * walks the addresses like any other navigation.
 */

const STORAGE = {
  levels: (accountId: string) => `wr:jlpt-selected-levels:${accountId}`,
  sticky: (accountId: string) => `wr:jlpt-sticky:${accountId}`,
  wkLevel: (accountId: string) => `wr:jlpt-wk-level:${accountId}`,
  grade: (accountId: string) => `wr:jlpt-grade:${accountId}`,
};

function readLevelOrNone(raw: string | null): LevelOrNone {
  if (raw === "none") return "none";
  const value = Number(raw);
  return raw && Number.isFinite(value) ? value : null;
}

function readStored(accountId: string): Partial<JlptFilterState> {
  const stored: Partial<JlptFilterState> = {};
  try {
    const rawLevels = window.localStorage.getItem(STORAGE.levels(accountId));
    if (rawLevels) {
      const levels = rawLevels.split(",").map(Number).filter((level) => level >= 1 && level <= 5);
      if (levels.length > 0) stored.levels = new Set(levels);
    }
    stored.stickyLevels = window.localStorage.getItem(STORAGE.sticky(accountId)) === "1";
    stored.wkLevelFilter = readLevelOrNone(window.localStorage.getItem(STORAGE.wkLevel(accountId)));
    stored.gradeFilter = readLevelOrNone(window.localStorage.getItem(STORAGE.grade(accountId)));
  } catch {
    /* A browser that refuses storage still gets the defaults. */
  }
  return stored;
}

function persist(accountId: string, state: JlptFilterState): void {
  try {
    window.localStorage.setItem(STORAGE.levels(accountId), [...state.levels].join(","));
    window.localStorage.setItem(STORAGE.sticky(accountId), state.stickyLevels ? "1" : "0");
    if (state.wkLevelFilter === null) window.localStorage.removeItem(STORAGE.wkLevel(accountId));
    else window.localStorage.setItem(STORAGE.wkLevel(accountId), String(state.wkLevelFilter));
    if (state.gradeFilter === null) window.localStorage.removeItem(STORAGE.grade(accountId));
    else window.localStorage.setItem(STORAGE.grade(accountId), String(state.gradeFilter));
  } catch {
    /* ignore */
  }
}

function writeAddress(state: JlptFilterState): void {
  const params = new URLSearchParams(window.location.search);
  writeJlptFilterAddress(params, state);
  const search = params.toString();
  const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(null, "", next);
}

export type JlptFilterControls = JlptFilterState & {
  setLevels: Dispatch<SetStateAction<Set<number>>>;
  setStickyLevels: Dispatch<SetStateAction<boolean>>;
  setWkFilter: Dispatch<SetStateAction<JlptFilter>>;
  setWkLevelFilter: Dispatch<SetStateAction<LevelOrNone>>;
  setGradeFilter: Dispatch<SetStateAction<LevelOrNone>>;
};

export function useJlptFilterState(accountId: string): JlptFilterControls {
  const [levels, setLevels] = useState<Set<number>>(() => defaultJlptLevels());
  const [stickyLevels, setStickyLevels] = useState(false);
  const [wkFilter, setWkFilter] = useState<JlptFilter>("all");
  const [wkLevelFilter, setWkLevelFilter] = useState<LevelOrNone>(null);
  const [gradeFilter, setGradeFilter] = useState<LevelOrNone>(null);
  /*
   * A ref, not state: nothing renders from it. It only stops the first pass
   * writing the defaults over what storage and the address are about to say.
   */
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;

    const apply = () => {
      const stored = readStored(accountId);
      const address = readJlptFilterAddress(new URLSearchParams(window.location.search));
      setLevels(address.levels ?? stored.levels ?? defaultJlptLevels());
      setStickyLevels(address.stickyLevels ?? stored.stickyLevels ?? false);
      setWkFilter(address.wkFilter ?? "all");
      setWkLevelFilter(address.wkLevelFilter ?? stored.wkLevelFilter ?? null);
      setGradeFilter(address.gradeFilter ?? stored.gradeFilter ?? null);
    };

    apply();
    hydrated.current = true;

    /* Back and forward walk the addresses, so the filters follow them. */
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [accountId]);

  useEffect(() => {
    if (!hydrated.current) return;
    const state = { levels, stickyLevels, wkFilter, wkLevelFilter, gradeFilter };
    persist(accountId, state);
    writeAddress(state);
  }, [accountId, gradeFilter, levels, stickyLevels, wkFilter, wkLevelFilter]);

  return {
    levels,
    stickyLevels,
    wkFilter,
    wkLevelFilter,
    gradeFilter,
    setLevels,
    setStickyLevels,
    setWkFilter,
    setWkLevelFilter,
    setGradeFilter,
  };
}
