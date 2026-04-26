import type { NewsArticle } from "./newsTypes";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const MAX_ENTRIES = 200;

type CacheEntry = {
  article: NewsArticle;
  fetchedAtMs: number;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

export function getCachedArticle(key: string): NewsArticle | null {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return {
    ...entry.article,
    cached: true,
    cachedAgeMs: Date.now() - entry.fetchedAtMs,
  };
}

export function setCachedArticle(key: string, article: NewsArticle): void {
  const fetchedAtMs = Date.parse(article.fetchedAt) || Date.now();
  store.set(key, {
    article: { ...article, cached: false, cachedAgeMs: undefined },
    fetchedAtMs,
    expiresAt: fetchedAtMs + TTL_MS,
  });

  if (store.size > MAX_ENTRIES) {
    pruneExpired();
  }
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(key);
    }
  }
}

export function newsCacheKey(url: string): string {
  return url.trim().toLowerCase();
}
