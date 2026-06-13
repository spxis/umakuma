import type { CatalogBrowseResponse } from "./catalogBrowseTypes";

type CachedCatalogBrowseResponse = {
  payload: CatalogBrowseResponse;
  cachedAtMs: number;
};

const CATALOG_BROWSE_TTL_MS = 20_000;
const CATALOG_BROWSE_MAX_KEYS = 200;
const catalogBrowseCache = new Map<string, CachedCatalogBrowseResponse>();

function trimOldestEntries(maxEntries: number): void {
  if (catalogBrowseCache.size <= maxEntries) {
    return;
  }

  const keysByAge = Array.from(catalogBrowseCache.entries())
    .sort((left, right) => left[1].cachedAtMs - right[1].cachedAtMs)
    .map(([key]) => key);

  const removeCount = Math.max(0, keysByAge.length - maxEntries);
  for (const key of keysByAge.slice(0, removeCount)) {
    catalogBrowseCache.delete(key);
  }
}

export function getCatalogBrowseCacheTtlMs(): number {
  return CATALOG_BROWSE_TTL_MS;
}

export function getCachedCatalogBrowse(key: string): CatalogBrowseResponse | null {
  const cached = catalogBrowseCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAtMs > CATALOG_BROWSE_TTL_MS) {
    catalogBrowseCache.delete(key);
    return null;
  }

  return cached.payload;
}

export function setCachedCatalogBrowse(key: string, payload: CatalogBrowseResponse): void {
  catalogBrowseCache.set(key, {
    payload,
    cachedAtMs: Date.now(),
  });

  trimOldestEntries(CATALOG_BROWSE_MAX_KEYS);
}

export function clearCatalogBrowseCache(): void {
  catalogBrowseCache.clear();
}
