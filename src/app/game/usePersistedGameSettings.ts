"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { getStoredJson, setStoredJson } from "@/lib/clientStorage";
import {
  GAME_CATEGORIES,
  GAME_DATE_RANGES,
  GAME_METRICS,
  isGameBatchSize,
  isGameCategory,
} from "@/lib/gameMode";
import { GAME_STORAGE_KEYS } from "./GameMode.constants";
import type { GameLeaderboardFilters, GameSelection } from "./GameMode.types";

const DEFAULT_SELECTION: GameSelection = { batchSize: 10, level: null, category: "mixed", hardMode: false, ultraMode: false };
const DEFAULT_FILTERS: GameLeaderboardFilters = {
  batchSize: "any",
  level: "any",
  mode: "all",
  range: "today",
  metric: "score",
  hardMode: false,
  ultraMode: false,
};
const subscribe = () => () => {};

function readSelection(): GameSelection {
  const stored = getStoredJson<Partial<GameSelection>>(GAME_STORAGE_KEYS.selection, {});
  return {
    batchSize: stored.batchSize === "all"
      ? "all"
      : isGameBatchSize(Number(stored.batchSize))
        ? Number(stored.batchSize) as GameSelection["batchSize"]
        : DEFAULT_SELECTION.batchSize,
    level: stored.level === null || (Number.isInteger(stored.level) && Number(stored.level) > 0) ? stored.level as number | null : DEFAULT_SELECTION.level,
    category: typeof stored.category === "string" && isGameCategory(stored.category) ? stored.category : DEFAULT_SELECTION.category,
    hardMode: stored.hardMode === true,
    ultraMode: stored.ultraMode === true,
  };
}

function readFilters(): GameLeaderboardFilters {
  const stored = getStoredJson<Partial<GameLeaderboardFilters>>(GAME_STORAGE_KEYS.leaderboardFilters, {});
  let level: GameLeaderboardFilters["level"] = DEFAULT_FILTERS.level;
  if (stored.level === "any" || stored.level === null) {
    level = stored.level;
  } else if (Number.isInteger(stored.level) && Number(stored.level) > 0) {
    level = Number(stored.level);
  }
  return {
    batchSize: stored.batchSize === "any"
      ? "any"
      : isGameBatchSize(Number(stored.batchSize))
        ? Number(stored.batchSize) as GameLeaderboardFilters["batchSize"]
        : DEFAULT_FILTERS.batchSize,
    level,
    mode: stored.mode === "all" || (typeof stored.mode === "string" && GAME_CATEGORIES.includes(stored.mode)) ? stored.mode : DEFAULT_FILTERS.mode,
    range: typeof stored.range === "string" && GAME_DATE_RANGES.includes(stored.range) ? stored.range : DEFAULT_FILTERS.range,
    metric: typeof stored.metric === "string" && GAME_METRICS.includes(stored.metric) ? stored.metric : DEFAULT_FILTERS.metric,
    hardMode: stored.hardMode === true,
    ultraMode: stored.ultraMode === true,
  };
}

function usePersistedValue<T>(key: string, fallback: T, read: () => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const hasMounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [override, setOverride] = useState<T | null>(null);
  const storedValue = useMemo(() => hasMounted ? read() : fallback, [fallback, hasMounted, read]);
  const value = override ?? storedValue;
  const setValue: React.Dispatch<React.SetStateAction<T>> = (next) => {
    setOverride((current) => {
      const previous = current ?? read();
      const resolved = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
      setStoredJson(key, resolved);
      return resolved;
    });
  };
  return [value, setValue];
}

export function usePersistedGameSettings() {
  const selection = usePersistedValue(GAME_STORAGE_KEYS.selection, DEFAULT_SELECTION, readSelection);
  const filters = usePersistedValue(GAME_STORAGE_KEYS.leaderboardFilters, DEFAULT_FILTERS, readFilters);
  return { selection, filters };
}