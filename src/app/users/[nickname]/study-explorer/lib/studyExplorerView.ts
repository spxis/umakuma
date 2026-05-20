import type { StudyWaitSortOrder } from "./studyExplorerTypes";

export function isStudyWaitSortOrder(value: string | null): value is StudyWaitSortOrder {
  return value === "oldest_wait" || value === "newest_wait";
}

export function getStudyGridColumns(): number {
  if (typeof window === "undefined") {
    return 4;
  }

  if (window.matchMedia("(min-width: 1024px)").matches) {
    return 4;
  }

  if (window.matchMedia("(min-width: 640px)").matches) {
    return 2;
  }

  return 1;
}

type CacheFooterArgs = {
  cachedAtMs: number | null;
  restoredCount: number;
  loadedCount: number;
  totalCount: number;
};

export function buildStudyCacheFooterText({
  cachedAtMs,
  restoredCount,
  loadedCount,
  totalCount,
}: CacheFooterArgs): string {
  if (!cachedAtMs) {
    return `Live data · ${loadedCount}/${totalCount} loaded`;
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - cachedAtMs) / 1000));
  const newCount = Math.max(0, loadedCount - restoredCount);
  const newLabel = newCount > 0 ? ` · +${newCount} new` : "";

  return `Cache ${ageSeconds}s old · ${restoredCount} restored · ${loadedCount}/${totalCount} loaded${newLabel}`;
}
