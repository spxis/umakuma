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
  requestLimit: number;
};

type StudyCacheTelemetry = {
  text: string;
  title: string;
};

export function buildStudyCacheTelemetry({
  cachedAtMs,
  restoredCount,
  loadedCount,
  totalCount,
  requestLimit,
}: CacheFooterArgs): StudyCacheTelemetry {
  const safeTotal = Math.max(0, totalCount);
  const safeLoaded = Math.max(0, loadedCount);
  const safeRestored = Math.max(0, restoredCount);
  const newCount = Math.max(0, safeLoaded - safeRestored);

  if (!cachedAtMs) {
    return {
      text: `Live data · ${safeLoaded}/${safeTotal} loaded`,
      title: `No warm cache was used. Initial request size: ${requestLimit}. Loaded now: ${safeLoaded}/${safeTotal}.`,
    };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - cachedAtMs) / 1000));
  const newLabel = newCount > 0 ? ` · +${newCount} new` : "";
  return {
    text: `Cache ${ageSeconds}s old · ${safeRestored} restored · ${safeLoaded}/${safeTotal} loaded${newLabel}`,
    title: `Cache hit. Restored from cache: ${safeRestored}. Newly fetched after restore: ${newCount}. Initial request size: ${requestLimit}. Currently loaded: ${safeLoaded}/${safeTotal}.`,
  };
}
