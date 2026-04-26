import { getStoredJson, setStoredJson } from "@/lib/clientStorage";

const STORAGE_KEY = "uk:news-history";
const MAX_ENTRIES = 50;

export type NewsHistoryEntry = {
  url: string;
  title: string;
  siteName: string | null;
  viewedAt: string;
};

export function readNewsHistory(): NewsHistoryEntry[] {
  const raw = getStoredJson<unknown>(STORAGE_KEY, null);
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: NewsHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as Partial<NewsHistoryEntry>;
    if (
      typeof candidate.url !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.viewedAt !== "string"
    ) {
      continue;
    }
    out.push({
      url: candidate.url,
      title: candidate.title,
      siteName: typeof candidate.siteName === "string" ? candidate.siteName : null,
      viewedAt: candidate.viewedAt,
    });
  }
  return out;
}

export function recordNewsView(entry: Omit<NewsHistoryEntry, "viewedAt">): NewsHistoryEntry[] {
  const next: NewsHistoryEntry = { ...entry, viewedAt: new Date().toISOString() };
  const existing = readNewsHistory().filter((row) => row.url !== next.url);
  const merged = [next, ...existing].slice(0, MAX_ENTRIES);
  setStoredJson(STORAGE_KEY, merged);
  return merged;
}

export function removeNewsView(url: string): NewsHistoryEntry[] {
  const next = readNewsHistory().filter((row) => row.url !== url);
  setStoredJson(STORAGE_KEY, next);
  return next;
}

export function clearNewsHistory(): void {
  setStoredJson(STORAGE_KEY, []);
}
