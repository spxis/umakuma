import type { JlptWordExample } from "@/lib/jlptTypes";
import type { RelatedReference } from "@/lib/glyphTypes";

export type KanjiCatalogRow = {
  wkSubjectId: number;
  level: number;
  characters: string | null;
  meanings: unknown;
  readings: unknown;
};

function optionalString(input: unknown): string | null {
  return typeof input === "string" && input.trim() ? input.trim() : null;
}

function parseKanjiItems(input: unknown): RelatedReference[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const subjectId = typeof row.subjectId === "number" ? row.subjectId : null;
    const label = optionalString(row.label);
    const wkLevel = typeof row.wkLevel === "number" ? row.wkLevel : null;
    if (!subjectId || !label || !wkLevel) return [];

    return [{
      subjectId,
      label,
      wkLevel,
      reading: optionalString(row.reading),
      meaning: optionalString(row.meaning),
    }];
  });
}

export function parseJlptWordExamples(input: unknown): JlptWordExample[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const written = optionalString(row.written) ?? "";
    const pronounced = optionalString(row.pronounced) ?? "";
    const gloss = optionalString(row.gloss) ?? "";
    if (!written && !pronounced) return [];

    const kanjiItems = parseKanjiItems(row.kanjiItems);
    return [{
      written,
      pronounced,
      gloss,
      ...(kanjiItems.length > 0 ? { kanjiItems } : {}),
    }];
  });
}

function primaryValue(input: unknown, key: "meaning" | "reading"): string | null {
  if (!Array.isArray(input)) return null;

  const primary = input.find((value) => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return record.primary === true && typeof record[key] === "string";
  });
  const fallback = primary ?? input.find((value) => value && typeof value === "object");
  if (!fallback || typeof fallback !== "object") return null;

  const value = (fallback as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function kanjiCharacters(input: string): string[] {
  return [...new Set(Array.from(input).filter((character) => /\p{Script=Han}/u.test(character)))];
}

export function enrichWordExamplesWithKanji(
  examples: JlptWordExample[],
  catalogRows: KanjiCatalogRow[],
): JlptWordExample[] {
  const catalogByCharacter = new Map(
    catalogRows
      .filter((row): row is KanjiCatalogRow & { characters: string } => Boolean(row.characters))
      .map((row) => [row.characters, row] as const),
  );

  return examples.map((example) => {
    const kanjiItems = kanjiCharacters(example.written)
      .map((character) => {
        const row = catalogByCharacter.get(character);
        if (!row) return null;

        return {
          subjectId: row.wkSubjectId,
          label: character,
          wkLevel: row.level,
          reading: primaryValue(row.readings, "reading"),
          meaning: primaryValue(row.meanings, "meaning"),
        };
      })
      .filter((item) => item !== null);

    return {
      written: example.written,
      pronounced: example.pronounced,
      gloss: example.gloss,
      ...(kanjiItems.length > 0 ? { kanjiItems } : {}),
    };
  });
}