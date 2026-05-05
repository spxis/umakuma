import type { StudyQueueItem } from "./studyExplorerTypes";

type Params = {
  queueMode: "review" | "lesson";
  viewedLevel: number | null;
  maxLevel: number;
  loadedItems: StudyQueueItem[];
  rawLevelCounts?: Record<number, number> | Record<string, number>;
};

function normalizeLevelCounts(rawLevelCounts?: Record<number, number> | Record<string, number>): Record<number, number> {
  if (!rawLevelCounts) {
    return {};
  }

  const normalized: Record<number, number> = {};
  for (const [levelRaw, count] of Object.entries(rawLevelCounts)) {
    const level = Number(levelRaw);
    if (!Number.isInteger(level) || level <= 0 || typeof count !== "number" || count <= 0) {
      continue;
    }

    normalized[level] = count;
  }

  return normalized;
}

export function resolveEffectiveViewedLevel({
  queueMode,
  viewedLevel,
  maxLevel,
  loadedItems,
  rawLevelCounts,
}: Params): number | null {
  if (queueMode === "review") {
    if (viewedLevel !== null && (viewedLevel < 1 || viewedLevel > maxLevel)) {
      return null;
    }

    return viewedLevel;
  }

  if (queueMode !== "lesson" || viewedLevel === null) {
    return viewedLevel;
  }

  const lessonLevelCounts = normalizeLevelCounts(rawLevelCounts);
  const lessonLevelFromCounts = (lessonLevelCounts[viewedLevel] ?? 0) > 0;
  const lessonLevelFromLoaded = loadedItems.some((item) => item.queueType === "lesson" && item.wkLevel === viewedLevel);
  if (!lessonLevelFromCounts && !lessonLevelFromLoaded) {
    return null;
  }

  return viewedLevel;
}