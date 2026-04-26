"use client";

import { getStoredJson, setStoredJson } from "@/lib/clientStorage";

import type { LookupKanjiItem } from "@/lib/news/newsKanjiLookup";

const CACHE_KEY = "uk:news-kanji-lookup";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ENTRIES = 600;

type CacheEntry = {
  fetchedAtMs: number;
  item: LookupKanjiItem;
};

type CacheStore = Record<string, CacheEntry>;

export function readKanjiLookupCache(chars: string[]): {
  hits: Record<string, LookupKanjiItem>;
  misses: string[];
} {
  const store = getStoredJson<CacheStore>(CACHE_KEY, {});
  const hits: Record<string, LookupKanjiItem> = {};
  const misses: string[] = [];
  const now = Date.now();
  let mutated = false;

  for (const char of chars) {
    const entry = store[char];
    if (!entry) {
      misses.push(char);
      continue;
    }
    if (now - entry.fetchedAtMs > TTL_MS) {
      delete store[char];
      mutated = true;
      misses.push(char);
      continue;
    }
    hits[char] = entry.item;
  }

  if (mutated) {
    setStoredJson(CACHE_KEY, store);
  }

  return { hits, misses };
}

export function writeKanjiLookupCache(items: LookupKanjiItem[]): void {
  if (items.length === 0) {
    return;
  }
  const store = getStoredJson<CacheStore>(CACHE_KEY, {});
  const now = Date.now();
  for (const item of items) {
    if (item.subjectId === null) {
      continue;
    }
    store[item.char] = { fetchedAtMs: now, item };
  }
  prune(store);
  setStoredJson(CACHE_KEY, store);
}

function prune(store: CacheStore): void {
  const keys = Object.keys(store);
  if (keys.length <= MAX_ENTRIES) {
    return;
  }
  keys
    .sort((a, b) => store[a].fetchedAtMs - store[b].fetchedAtMs)
    .slice(0, keys.length - MAX_ENTRIES)
    .forEach((key) => {
      delete store[key];
    });
}
