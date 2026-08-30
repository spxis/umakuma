"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { getStoredJson, setStoredJson } from "@/lib/clientStorage";
import {
  GAME_CATEGORIES,
  GAME_DATE_RANGES,
  GAME_KINDS,
  GAME_METRICS,
  isGameBatchSize,
  isGameCategory,
  isGameAnswerMode,
  isGameChoiceCount,
  isGameDirection,
  isGameKind,
  isGamePracticeList,
  isGameTimeLimitMs,
  GAME_PRACTICE_LISTS,
} from "@/lib/gameMode";
import { GAME_STORAGE_KEYS } from "./GameMode.constants";
import type { GameLeaderboardFilters, GameSelection } from "./GameMode.types";

const DEFAULT_SELECTION: GameSelection = {
  kind: GAME_KINDS.match,
  batchSize: 10,
  level: null,
  category: "mixed",
  choiceCount: 2,
  direction: "find",
  answerMode: "auto",
  practiceList: GAME_PRACTICE_LISTS.trouble,
  ultraMode: false,
  timeLimitMs: 60_000,
};
const DEFAULT_FILTERS: GameLeaderboardFilters = {
  kind: "any",
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
    kind: typeof stored.kind === "string" && isGameKind(stored.kind) ? stored.kind : DEFAULT_SELECTION.kind,
    timeLimitMs: isGameTimeLimitMs(Number(stored.timeLimitMs))
      ? Number(stored.timeLimitMs) as GameSelection["timeLimitMs"]
      : DEFAULT_SELECTION.timeLimitMs,
    batchSize: stored.batchSize === "all"
      ? "all"
      : isGameBatchSize(Number(stored.batchSize))
        ? Number(stored.batchSize) as GameSelection["batchSize"]
        : DEFAULT_SELECTION.batchSize,
    level: stored.level === null || (Number.isInteger(stored.level) && Number(stored.level) > 0) ? stored.level as number | null : DEFAULT_SELECTION.level,
    category: typeof stored.category === "string" && isGameCategory(stored.category) ? stored.category : DEFAULT_SELECTION.category,
    choiceCount: isGameChoiceCount(Number(stored.choiceCount))
      ? Number(stored.choiceCount) as GameSelection["choiceCount"]
      : DEFAULT_SELECTION.choiceCount,
    direction: typeof stored.direction === "string" && isGameDirection(stored.direction) ? stored.direction : DEFAULT_SELECTION.direction,
    answerMode: typeof stored.answerMode === "string" && isGameAnswerMode(stored.answerMode) ? stored.answerMode : DEFAULT_SELECTION.answerMode,
    practiceList: typeof stored.practiceList === "string" && isGamePracticeList(stored.practiceList) ? stored.practiceList : DEFAULT_SELECTION.practiceList,
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
    kind: typeof stored.kind === "string" && isGameKind(stored.kind) ? stored.kind : DEFAULT_FILTERS.kind,
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