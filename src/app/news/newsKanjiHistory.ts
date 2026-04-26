"use client";

import { getStoredJson, setStoredJson } from "@/lib/clientStorage";

const STORAGE_KEY = "uk:news-kanji-history";
const MAX_ENTRIES = 100;
export const NEWS_KANJI_HISTORY_EVENT = "uk:news-kanji-history-changed";

export type NewsKanjiHistoryEntry = {
  run: string;
  lastClickedAt: string;
  clickCount: number;
  hasVocabulary: boolean;
  knownCount: number;
  totalCount: number;
};

export function readNewsKanjiHistory(): NewsKanjiHistoryEntry[] {
  const raw = getStoredJson<unknown>(STORAGE_KEY, null);
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: NewsKanjiHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as Partial<NewsKanjiHistoryEntry>;
    if (
      typeof candidate.run !== "string" ||
      typeof candidate.lastClickedAt !== "string" ||
      typeof candidate.clickCount !== "number"
    ) {
      continue;
    }
    out.push({
      run: candidate.run,
      lastClickedAt: candidate.lastClickedAt,
      clickCount: candidate.clickCount,
      hasVocabulary: Boolean(candidate.hasVocabulary),
      knownCount:
        typeof candidate.knownCount === "number" ? candidate.knownCount : 0,
      totalCount:
        typeof candidate.totalCount === "number" ? candidate.totalCount : 0,
    });
  }
  return out;
}

export function recordNewsKanjiClick(entry: {
  run: string;
  hasVocabulary: boolean;
  knownCount: number;
  totalCount: number;
}): NewsKanjiHistoryEntry[] {
  const now = new Date().toISOString();
  const existing = readNewsKanjiHistory();
  const found = existing.find((row) => row.run === entry.run);

  let next: NewsKanjiHistoryEntry[];
  if (found) {
    const updated: NewsKanjiHistoryEntry = {
      ...found,
      clickCount: found.clickCount + 1,
      lastClickedAt: now,
      hasVocabulary: entry.hasVocabulary,
      knownCount: entry.knownCount,
      totalCount: entry.totalCount,
    };
    next = [updated, ...existing.filter((row) => row.run !== entry.run)];
  } else {
    next = [
      {
        run: entry.run,
        lastClickedAt: now,
        clickCount: 1,
        hasVocabulary: entry.hasVocabulary,
        knownCount: entry.knownCount,
        totalCount: entry.totalCount,
      },
      ...existing,
    ];
  }

  const trimmed = next.slice(0, MAX_ENTRIES);
  setStoredJson(STORAGE_KEY, trimmed);
  dispatchNewsKanjiHistoryChanged();
  return trimmed;
}

export function removeNewsKanjiHistory(run: string): NewsKanjiHistoryEntry[] {
  const next = readNewsKanjiHistory().filter((row) => row.run !== run);
  setStoredJson(STORAGE_KEY, next);
  dispatchNewsKanjiHistoryChanged();
  return next;
}

export function clearNewsKanjiHistory(): void {
  setStoredJson(STORAGE_KEY, []);
  dispatchNewsKanjiHistoryChanged();
}

function dispatchNewsKanjiHistoryChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(NEWS_KANJI_HISTORY_EVENT));
}
