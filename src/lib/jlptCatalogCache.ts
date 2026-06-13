import type { JlptCatalogResponse } from "@/lib/jlptCatalogTypes";

type CachedJlptCatalog = {
  payload: JlptCatalogResponse;
  cachedAtMs: number;
};

const JLPT_CATALOG_CACHE_TTL_MS = 20_000;
const JLPT_CATALOG_CACHE_MAX_KEYS = 120;
const cache = new Map<string, CachedJlptCatalog>();

function trimOldest(): void {
  if (cache.size <= JLPT_CATALOG_CACHE_MAX_KEYS) {
    return;
  }

  const entriesByAge = Array.from(cache.entries()).sort((left, right) => left[1].cachedAtMs - right[1].cachedAtMs);
  const removeCount = Math.max(0, entriesByAge.length - JLPT_CATALOG_CACHE_MAX_KEYS);
  for (const [key] of entriesByAge.slice(0, removeCount)) {
    cache.delete(key);
  }
}

export function getJlptCatalogCacheTtlMs(): number {
  return JLPT_CATALOG_CACHE_TTL_MS;
}

export function getCachedJlptCatalog(key: string): JlptCatalogResponse | null {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAtMs > JLPT_CATALOG_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return cached.payload;
}

export function setCachedJlptCatalog(key: string, payload: JlptCatalogResponse): void {
  cache.set(key, {
    payload,
    cachedAtMs: Date.now(),
  });
  trimOldest();
}

export function clearJlptCatalogCache(): void {
  cache.clear();
}
