import { getStoredJson, setStoredJson } from "@/lib/clientStorage";

export const NEWS_READING_PREFS_KEY = "uk:news-reading-prefs";

export type NewsTextSize = "sm" | "md" | "lg" | "xl" | "2xl";
export type NewsArticleFont = "body" | "jp-sans" | "jp-serif";
export type NewsKanjiCapBasis = "jlpt" | "wk" | "grade";
export type NewsKanjiCapJlpt = "all" | "n5" | "n4" | "n3" | "n2" | "n1";
export type NewsKanjiCapWk = "all" | `${number}`;
export type NewsKanjiCapGrade = "all" | "1" | "2" | "3" | "4" | "5" | "6" | "8";

export const NEWS_KANJI_CAP_BASIS_OPTIONS: readonly NewsKanjiCapBasis[] = [
  "jlpt",
  "wk",
  "grade",
];
export const NEWS_KANJI_CAP_JLPT_OPTIONS: readonly NewsKanjiCapJlpt[] = [
  "all",
  "n5",
  "n4",
  "n3",
  "n2",
  "n1",
];
const MAX_WK_LEVEL = 60;
export const NEWS_KANJI_CAP_GRADE_OPTIONS: readonly NewsKanjiCapGrade[] = [
  "all",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
];

export type NewsReadingPrefs = {
  textSize: NewsTextSize;
  emphasizeKanji: boolean;
  articleFont: NewsArticleFont;
  kanjiCapBasis: NewsKanjiCapBasis;
  kanjiCapJlpt: NewsKanjiCapJlpt;
  kanjiCapWk: NewsKanjiCapWk;
  kanjiCapGrade: NewsKanjiCapGrade;
};

export const DEFAULT_NEWS_READING_PREFS: NewsReadingPrefs = {
  textSize: "lg",
  emphasizeKanji: false,
  articleFont: "body",
  kanjiCapBasis: "jlpt",
  kanjiCapJlpt: "all",
  kanjiCapWk: "all",
  kanjiCapGrade: "all",
};

const TEXT_SIZE_ORDER: NewsTextSize[] = ["sm", "md", "lg", "xl", "2xl"];
const ARTICLE_FONTS: NewsArticleFont[] = ["body", "jp-sans", "jp-serif"];

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
  const articleFont = ARTICLE_FONTS.includes(stored.articleFont as NewsArticleFont)
    ? (stored.articleFont as NewsArticleFont)
    : DEFAULT_NEWS_READING_PREFS.articleFont;
  const kanjiCapBasis = NEWS_KANJI_CAP_BASIS_OPTIONS.includes(
    stored.kanjiCapBasis as NewsKanjiCapBasis,
  )
    ? (stored.kanjiCapBasis as NewsKanjiCapBasis)
    : DEFAULT_NEWS_READING_PREFS.kanjiCapBasis;
  const kanjiCapJlpt = NEWS_KANJI_CAP_JLPT_OPTIONS.includes(
    stored.kanjiCapJlpt as NewsKanjiCapJlpt,
  )
    ? (stored.kanjiCapJlpt as NewsKanjiCapJlpt)
    : DEFAULT_NEWS_READING_PREFS.kanjiCapJlpt;
  const kanjiCapWk = isValidWkCap(stored.kanjiCapWk)
    ? (stored.kanjiCapWk as NewsKanjiCapWk)
    : DEFAULT_NEWS_READING_PREFS.kanjiCapWk;
  const kanjiCapGrade = NEWS_KANJI_CAP_GRADE_OPTIONS.includes(
    stored.kanjiCapGrade as NewsKanjiCapGrade,
  )
    ? (stored.kanjiCapGrade as NewsKanjiCapGrade)
    : DEFAULT_NEWS_READING_PREFS.kanjiCapGrade;
  return {
    textSize,
    emphasizeKanji,
    articleFont,
    kanjiCapBasis,
    kanjiCapJlpt,
    kanjiCapWk,
    kanjiCapGrade,
  };
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
      return "text-base leading-[1.9]";
    case "lg":
      return "text-xl leading-[2.05]";
    case "xl":
      return "text-2xl leading-[2.1]";
    case "2xl":
      return "text-3xl leading-[2.15]";
    case "md":
    default:
      return "text-lg leading-[2]";
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
    case "2xl":
      return "XX-Large";
    case "md":
    default:
      return "Medium";
  }
}

export function articleFontLabel(font: NewsArticleFont): string {
  switch (font) {
    case "jp-sans":
      return "JP Sans";
    case "jp-serif":
      return "JP Serif";
    case "body":
    default:
      return "Body";
  }
}

export function kanjiCapBasisLabel(value: NewsKanjiCapBasis): string {
  switch (value) {
    case "wk":
      return "WK";
    case "grade":
      return "Grade";
    case "jlpt":
    default:
      return "JLPT";
  }
}

export function kanjiCapLabel(
  basis: NewsKanjiCapBasis,
  value: NewsKanjiCapJlpt | NewsKanjiCapWk | NewsKanjiCapGrade,
): string {
  if (value === "all") {
    return "All";
  }

  if (basis === "jlpt") {
    return `${String(value).toUpperCase()}+`;
  }

  return `${value}+`;
}

export function buildWkCapOptions(userWkLevel?: number | null): NewsKanjiCapWk[] {
  const normalizedUserLevel =
    typeof userWkLevel === "number"
      ? Math.max(1, Math.min(MAX_WK_LEVEL, Math.floor(userWkLevel)))
      : null;

  const levels: NewsKanjiCapWk[] = ["all"];

  if (normalizedUserLevel !== null) {
    for (let level = 1; level <= normalizedUserLevel; level += 1) {
      levels.push(String(level) as NewsKanjiCapWk);
    }
    for (let level = normalizedUserLevel + 1; level <= MAX_WK_LEVEL; level += 1) {
      levels.push(String(level) as NewsKanjiCapWk);
    }
    return levels;
  }

  for (let level = 1; level <= MAX_WK_LEVEL; level += 1) {
    levels.push(String(level) as NewsKanjiCapWk);
  }
  return levels;
}

function isValidWkCap(value: unknown): value is NewsKanjiCapWk {
  if (value === "all") {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_WK_LEVEL;
}
