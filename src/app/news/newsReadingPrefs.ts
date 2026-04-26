import { getStoredJson, setStoredJson } from "@/lib/clientStorage";

export const NEWS_READING_PREFS_KEY = "uk:news-reading-prefs";

export type NewsTextSize = "sm" | "md" | "lg" | "xl";

export type NewsReadingPrefs = {
  textSize: NewsTextSize;
  emphasizeKanji: boolean;
};

export const DEFAULT_NEWS_READING_PREFS: NewsReadingPrefs = {
  textSize: "md",
  emphasizeKanji: false,
};

const TEXT_SIZE_ORDER: NewsTextSize[] = ["sm", "md", "lg", "xl"];

export function readReadingPrefs(): NewsReadingPrefs {
  const stored = getStoredJson<Partial<NewsReadingPrefs> | null>(
    NEWS_READING_PREFS_KEY,
    null,
  );
  if (!stored || typeof stored !== "object") {
    return { ...DEFAULT_NEWS_READING_PREFS };
  }
  const textSize = TEXT_SIZE_ORDER.includes(stored.textSize as NewsTextSize)
    ? (stored.textSize as NewsTextSize)
    : DEFAULT_NEWS_READING_PREFS.textSize;
  const emphasizeKanji =
    typeof stored.emphasizeKanji === "boolean"
      ? stored.emphasizeKanji
      : DEFAULT_NEWS_READING_PREFS.emphasizeKanji;
  return { textSize, emphasizeKanji };
}

export function writeReadingPrefs(prefs: NewsReadingPrefs): void {
  setStoredJson(NEWS_READING_PREFS_KEY, prefs);
}

export function bumpTextSize(current: NewsTextSize, delta: 1 | -1): NewsTextSize {
  const index = TEXT_SIZE_ORDER.indexOf(current);
  const safe = index < 0 ? TEXT_SIZE_ORDER.indexOf(DEFAULT_NEWS_READING_PREFS.textSize) : index;
  const next = Math.max(0, Math.min(TEXT_SIZE_ORDER.length - 1, safe + delta));
  return TEXT_SIZE_ORDER[next] ?? DEFAULT_NEWS_READING_PREFS.textSize;
}

export function textSizeClass(size: NewsTextSize): string {
  switch (size) {
    case "sm":
      return "text-[0.95rem] leading-[1.85]";
    case "lg":
      return "text-lg leading-[2]";
    case "xl":
      return "text-xl leading-[2.05]";
    case "md":
    default:
      return "text-base leading-[1.95]";
  }
}

export function textSizeLabel(size: NewsTextSize): string {
  switch (size) {
    case "sm":
      return "Small";
    case "lg":
      return "Large";
    case "xl":
      return "X-Large";
    case "md":
    default:
      return "Medium";
  }
}
