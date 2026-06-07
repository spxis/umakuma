import type { CustomLibraryItemPayload } from "./customStudyTypes";
import { type WkSubject, uniqueStrings } from "./customLibraryWanikaniLookup";

const STATUS_MEANING_REGEX = /\b(?:pending|todo|tbd|wip|unknown|placeholder|none|n\/a)\b/i;
const LATIN_CHAR_REGEX = /[A-Za-z]/;
const KANJI_CHAR_REGEX = /\p{Script=Han}/u;
const KANA_CHAR_REGEX = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;

const LATIN_LETTER_TO_KATAKANA: Record<string, string> = {
  A: "エー",
  B: "ビー",
  C: "シー",
  D: "ディー",
  E: "イー",
  F: "エフ",
  G: "ジー",
  H: "エイチ",
  I: "アイ",
  J: "ジェー",
  K: "ケー",
  L: "エル",
  M: "エム",
  N: "エヌ",
  O: "オー",
  P: "ピー",
  Q: "キュー",
  R: "アール",
  S: "エス",
  T: "ティー",
  U: "ユー",
  V: "ブイ",
  W: "ダブリュー",
  X: "エックス",
  Y: "ワイ",
  Z: "ゼット",
};

const DIGIT_TO_KATAKANA: Record<string, string> = {
  "0": "ゼロ",
  "1": "イチ",
  "2": "ニ",
  "3": "サン",
  "4": "ヨン",
  "5": "ゴ",
  "6": "ロク",
  "7": "ナナ",
  "8": "ハチ",
  "9": "キュウ",
};

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function hasUsefulMeaning(meanings: string[]): boolean {
  return meanings.some((value) => {
    const normalized = value.trim();
    if (!normalized || normalized === "-") {
      return false;
    }

    if (/^(?:n\/a|na|none|unknown|todo|tbd|wip)$/i.test(normalized)) {
      return false;
    }

    return true;
  });
}

function shouldPromoteLiteralMeaning(characters: string, meanings: string[]): boolean {
  if (!LATIN_CHAR_REGEX.test(characters)) {
    return false;
  }

  if (meanings.length === 0) {
    return true;
  }

  return meanings.every((value) => {
    const normalized = value.trim();
    if (!normalized) {
      return true;
    }

    return STATUS_MEANING_REGEX.test(normalized);
  });
}

function containsKanjiOrLatin(value: string): boolean {
  return /[\p{Script=Han}A-Za-z]/u.test(value);
}

function toKanaToken(character: string): string {
  if (KANA_CHAR_REGEX.test(character)) {
    return character;
  }

  if (LATIN_CHAR_REGEX.test(character)) {
    return LATIN_LETTER_TO_KATAKANA[character.toUpperCase()] ?? "";
  }

  if (/[0-9]/.test(character)) {
    return DIGIT_TO_KATAKANA[character] ?? "";
  }

  return "";
}

function normalizeToKana(input: string): string {
  let output = "";
  for (const character of Array.from(input)) {
    output += toKanaToken(character);
  }

  return output;
}

function buildFallbackReading(characters: string, wkKanjiByCharacter: Map<string, WkSubject>): string | null {
  const input = characters.trim();
  if (!input) {
    return null;
  }

  let output = "";
  for (const character of Array.from(input)) {
    if (KANJI_CHAR_REGEX.test(character)) {
      const subject = wkKanjiByCharacter.get(character);
      const replacement = subject?.primaryReading ?? subject?.readings[0] ?? "";
      output += normalizeToKana(replacement);
      continue;
    }

    output += toKanaToken(character);
  }

  const normalized = output.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildLiteralMeaningFallback(characters: string, wkKanjiByCharacter: Map<string, WkSubject>): string | null {
  const parts = uniqueStrings(
    Array.from(characters)
      .filter((character) => KANJI_CHAR_REGEX.test(character))
      .map((character) => {
        const subject = wkKanjiByCharacter.get(character);
        return subject?.primaryMeaning ?? subject?.meanings[0] ?? "";
      })
      .filter(Boolean),
  );

  if (parts.length === 0) {
    return null;
  }

  return `Literal: ${parts.join(" / ")}`;
}

function repairMeanings(params: {
  sourceCharacters: string;
  meanings: string[];
  literalFallback: string | null;
  fallbackReading: string | null;
}): string[] {
  const currentMeanings = uniqueStrings(params.meanings);

  if (currentMeanings.length === 0) {
    if (params.literalFallback) {
      return [params.literalFallback];
    }

    if (params.fallbackReading) {
      return [`Literal: ${params.fallbackReading}`];
    }

    return ["Literal item"];
  }

  if (!params.literalFallback) {
    return currentMeanings;
  }

  if (shouldPromoteLiteralMeaning(params.sourceCharacters, currentMeanings)) {
    return uniqueStrings([params.literalFallback, ...currentMeanings]);
  }

  if (!hasUsefulMeaning(currentMeanings)) {
    return uniqueStrings([params.literalFallback, ...currentMeanings]);
  }

  if (currentMeanings.some(containsKanjiOrLatin) && params.fallbackReading) {
    return currentMeanings.map((meaning) => {
      if (meaning.startsWith("Literal:")) {
        return `Literal: ${params.fallbackReading}`;
      }

      return meaning;
    });
  }

  return currentMeanings;
}

export function repairCustomSourceItemData(params: {
  item: CustomLibraryItemPayload;
  wkKanjiByCharacter: Map<string, WkSubject>;
}): {
  meanings: string[];
  readings: string[];
  primaryReading: string | undefined;
  hasDataRepair: boolean;
} {
  const fallbackReading = buildFallbackReading(params.item.characters, params.wkKanjiByCharacter);
  const literalFallback = buildLiteralMeaningFallback(params.item.characters, params.wkKanjiByCharacter);

  const repairedMeanings = repairMeanings({
    sourceCharacters: params.item.characters,
    meanings: params.item.meanings,
    literalFallback,
    fallbackReading,
  });

  const existingReadings = uniqueStrings([
    ...(params.item.readings ?? []),
    params.item.primaryReading ?? "",
  ]).map((value) => normalizeToKana(value)).filter(Boolean);

  const existingPrimaryReading = normalizeToKana(params.item.primaryReading ?? "");

  const repairedReadings = existingReadings.length > 0
    ? existingReadings
    : fallbackReading
      ? [fallbackReading]
      : (params.item.readings ?? []);
  const repairedPrimaryReading = existingPrimaryReading
    ? existingPrimaryReading
    : (existingReadings[0] ?? fallbackReading ?? undefined);

  const hasDataRepair =
    !arraysEqual(params.item.meanings, repairedMeanings) ||
    !arraysEqual(params.item.readings ?? [], repairedReadings) ||
    (params.item.primaryReading ?? undefined) !== repairedPrimaryReading;

  return {
    meanings: repairedMeanings,
    readings: repairedReadings,
    primaryReading: repairedPrimaryReading,
    hasDataRepair,
  };
}