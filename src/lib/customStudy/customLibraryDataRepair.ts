import type { CustomLibraryItemPayload } from "./customStudyTypes";
import { type WkSubject, uniqueStrings } from "./customLibraryWanikaniLookup";

const STATUS_MEANING_REGEX = /\b(?:pending|todo|tbd|wip|unknown|placeholder|none|n\/a)\b/i;
const LATIN_CHAR_REGEX = /[A-Za-z]/;
const KANJI_CHAR_REGEX = /\p{Script=Han}/u;

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

function buildFallbackReading(characters: string, wkKanjiByCharacter: Map<string, WkSubject>): string | null {
  const input = characters.trim();
  if (!input) {
    return null;
  }

  let output = "";
  for (const character of Array.from(input)) {
    if (KANJI_CHAR_REGEX.test(character)) {
      const subject = wkKanjiByCharacter.get(character);
      const replacement = subject?.primaryReading ?? subject?.readings[0] ?? character;
      output += replacement;
      continue;
    }

    output += character;
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
  characters: string;
  meanings: string[];
  wkKanjiByCharacter: Map<string, WkSubject>;
}): string[] {
  const currentMeanings = uniqueStrings(params.meanings);
  const literalFallback = buildLiteralMeaningFallback(params.characters, params.wkKanjiByCharacter);

  if (currentMeanings.length === 0) {
    if (literalFallback) {
      return [literalFallback];
    }

    const fallback = params.characters.trim();
    return fallback ? [fallback] : currentMeanings;
  }

  if (!literalFallback) {
    return currentMeanings;
  }

  if (shouldPromoteLiteralMeaning(params.characters, currentMeanings)) {
    return uniqueStrings([literalFallback, ...currentMeanings]);
  }

  if (!hasUsefulMeaning(currentMeanings)) {
    return uniqueStrings([literalFallback, ...currentMeanings]);
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
  const repairedMeanings = repairMeanings({
    characters: params.item.characters,
    meanings: params.item.meanings,
    wkKanjiByCharacter: params.wkKanjiByCharacter,
  });

  const existingReadings = uniqueStrings([
    ...(params.item.readings ?? []),
    params.item.primaryReading ?? "",
  ]);
  const fallbackReading = existingReadings.length > 0
    ? null
    : buildFallbackReading(params.item.characters, params.wkKanjiByCharacter);
  const repairedReadings = existingReadings.length > 0
    ? uniqueStrings(params.item.readings ?? existingReadings)
    : fallbackReading
      ? [fallbackReading]
      : (params.item.readings ?? []);
  const repairedPrimaryReading = params.item.primaryReading?.trim()
    ? params.item.primaryReading.trim()
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