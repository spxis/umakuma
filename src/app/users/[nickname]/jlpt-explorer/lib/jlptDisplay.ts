import { toRomaji } from "wanakana";
import { katakanaToHiragana } from "@/lib/kana";

export function formatNumber(input: number): string {
  return new Intl.NumberFormat("en-US").format(input);
}

export function normalizeSearch(input: string): string {
  return input.trim().toLowerCase();
}

export function formatDate(input: string | null | undefined): string {
  if (!input) {
    return "-";
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function stripReadingSeparators(input: string): string {
  return input.replace(/[.・]/g, "").trim();
}

/**
 * A reading as the search compares it: separators gone and one kana script.
 *
 * KANJIDIC writes on readings in katakana and kun readings in hiragana, so a
 * member typing りょう never matched リョウ. That gap used to be papered over by
 * shipping jlptReadings.json to the browser purely because it happened to hold
 * hiragana forms - 397KB to work around a missing fold.
 */
export function normalizeReadingForSearch(reading: string): string {
  return katakanaToHiragana(normalizeSearch(stripReadingSeparators(reading)));
}

export function readingLabel(reading: string | null, showEnglish: boolean): string {
  if (!reading) {
    return "-";
  }

  const normalizedReading = stripReadingSeparators(reading);

  if (!showEnglish) {
    return normalizedReading;
  }

  const romaji = toRomaji(normalizedReading, { upcaseKatakana: false }).trim();
  return romaji && romaji !== normalizedReading ? `${normalizedReading} / ${romaji}` : normalizedReading;
}

export function readingLabelFromList(readings: string[], showEnglish: boolean): string {
  if (readings.length === 0) {
    return "-";
  }

  const primary = readings[0] ?? null;
  return readingLabel(primary, showEnglish);
}

export function jlptHeading(
  mainMeaning: string | null | undefined,
  userMeanings: string[] | undefined,
  fallbackMeanings: string[] | undefined,
  fallbackKanji: string,
): string {
  const fromMain = mainMeaning?.trim();
  if (fromMain) {
    return fromMain;
  }

  const fromUser = userMeanings?.[0]?.trim();
  if (fromUser) {
    return fromUser;
  }

  const fromFallback = fallbackMeanings?.[0]?.trim();
  if (fromFallback) {
    return fromFallback;
  }

  return fallbackKanji;
}

type JlptSearchItem = {
  kanji: string;
  kunReadings: string[];
  onReadings: string[];
  nanoriReadings: string[];
  primaryMeaning?: string | null;
  meanings: string[];
};


export function matchesJlptSearch(
  item: JlptSearchItem,
  rawQuery: string,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;

  const readings = [...item.kunReadings, ...item.onReadings, ...item.nanoriReadings];
  const meanings = [...(item.primaryMeaning ? [item.primaryMeaning] : []), ...item.meanings];
  const romaji = normalizeSearch(toRomaji(item.kanji, { upcaseKatakana: false }));
  /* Both sides folded, so a hiragana query reaches a katakana on reading. */
  const foldedQuery = katakanaToHiragana(normalizedQuery);

  return (
    item.kanji.includes(rawQuery.trim()) ||
    normalizeSearch(item.kanji).includes(normalizedQuery) ||
    romaji.includes(normalizedQuery) ||
    readings.some((r) => normalizeSearch(r).includes(normalizedQuery) || normalizeReadingForSearch(r).includes(foldedQuery)) ||
    readings.some((r) => normalizeSearch(toRomaji(stripReadingSeparators(r), { upcaseKatakana: false })).includes(normalizedQuery)) ||
    meanings.some((m) => normalizeSearch(m).includes(normalizedQuery))
  );
}
