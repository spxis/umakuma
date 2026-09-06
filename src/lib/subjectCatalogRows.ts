import { SUBJECT_TYPES, isSubjectType, type SubjectType } from "@/lib/domainConstants";

import { resolveSubjectGlyph } from "./radicalGlyphs";

/**
 * A catalogue row, read.
 *
 * The shape WaniKani stores and the four questions asked of it: what kind of
 * subject this is, what it means, how it is read, and what to call it when it
 * has no characters of its own. Split out of `subjectCatalogDetails` when that
 * file reached the five-hundred-line gate; the assembly of a detail - the
 * cache, the related lookups, the JLPT join - stayed there.
 */

export type CatalogRelatedReference = {
  subjectId: number;
  label: string;
  wkLevel: number | null;
  reading: string | null;
  meaning: string | null;
  /*
   * What the reference is and how it is addressed, so a page can link to it.
   * A radical WaniKani draws has no characters, only a slug, and a chip built
   * from the label alone would send it to a kanji page that does not exist.
   */
  subjectType: SubjectType;
  characters: string | null;
  slug: string | null;
};

export type CatalogRow = {
  wkSubjectId: number;
  subjectType: string;
  level: number;
  slug: string | null;
  characters: string | null;
  meanings: unknown;
  readings: unknown;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
  meaningMnemonic: string | null;
  readingMnemonic: string | null;
};

export function normalizeSubjectType(value: string): SubjectType {
  if (isSubjectType(value)) {
    return value;
  }

  return SUBJECT_TYPES.vocabulary;
}

export function parseMeanings(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const output: string[] = [];
  const seen = new Set<string>();
  const primary: string[] = [];
  const secondary: string[] = [];

  for (const value of raw) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const row = value as { meaning?: unknown; primary?: unknown };
    if (typeof row.meaning !== "string") {
      continue;
    }

    const meaning = row.meaning.trim();
    if (!meaning || seen.has(meaning)) {
      continue;
    }

    seen.add(meaning);
    if (row.primary === true) {
      primary.push(meaning);
    } else {
      secondary.push(meaning);
    }
  }

  for (const value of [...primary, ...secondary]) {
    output.push(value);
  }

  return output;
}

/**
 * WaniKani's own names for the two kinds of kanji reading, as they appear in
 * the `type` field of a subject's readings. Nanori - the name reading - rides
 * along in `readings` and belongs in neither lane.
 */
const WK_READING_TYPES = { onyomi: "onyomi", kunyomi: "kunyomi" } as const;

export function parseReadings(raw: unknown): {
  readings: string[];
  primaryReadings: string[];
  onReadings: string[];
  kunReadings: string[];
} {
  if (!Array.isArray(raw)) {
    return { readings: [], primaryReadings: [], onReadings: [], kunReadings: [] };
  }

  const readings: string[] = [];
  const primaryReadings: string[] = [];
  const onReadings: string[] = [];
  const kunReadings: string[] = [];
  const seenReadings = new Set<string>();
  const seenPrimaryReadings = new Set<string>();

  for (const value of raw) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const row = value as { reading?: unknown; primary?: unknown; accepted_answer?: unknown; type?: unknown };
    if (row.accepted_answer === false || typeof row.reading !== "string") {
      continue;
    }

    const reading = row.reading.trim();
    if (!reading) {
      continue;
    }

    if (!seenReadings.has(reading)) {
      seenReadings.add(reading);
      readings.push(reading);
    }

    if (row.primary === true && !seenPrimaryReadings.has(reading)) {
      seenPrimaryReadings.add(reading);
      primaryReadings.push(reading);
    }

    /*
     * Which of the two a reading is, kept rather than thrown away.
     *
     * A kanji has an on reading and a kun reading and a list showed one of
     * them - whichever WaniKani had marked primary - so a member reading
     * their own list could not see the half they were not being taught.
     * Only kanji carry the field; a word's reading is neither.
     */
    if (row.type === WK_READING_TYPES.onyomi && !onReadings.includes(reading)) onReadings.push(reading);
    if (row.type === WK_READING_TYPES.kunyomi && !kunReadings.includes(reading)) kunReadings.push(reading);
  }

  return { readings, primaryReadings, onReadings, kunReadings };
}

export function primaryMeaning(raw: unknown): string | null {
  return parseMeanings(raw)[0] ?? null;
}

export function primaryReading(raw: unknown): string | null {
  const { primaryReadings, readings } = parseReadings(raw);
  return primaryReadings[0] ?? readings[0] ?? null;
}

export function subjectLabel(row: CatalogRow | undefined): string {
  if (!row) {
    return "-";
  }

  /* Characterless radicals resolve to a glyph; the slug printed "tofu". */
  const glyph = resolveSubjectGlyph(row);
  return glyph || row.slug?.trim() || String(row.wkSubjectId);
}

export function toRelatedReference(
  subjectId: number,
  rowMap: Map<number, CatalogRow>,
  options?: { useMeaningForReading?: boolean },
): CatalogRelatedReference {
  const row = rowMap.get(subjectId);
  const meaning = row ? primaryMeaning(row.meanings) : null;
  const reading = row
    ? options?.useMeaningForReading
      ? meaning
      : primaryReading(row.readings)
    : null;

  return {
    subjectId,
    label: subjectLabel(row),
    wkLevel: row?.level ?? null,
    reading,
    meaning,
    subjectType: normalizeSubjectType(row?.subjectType ?? ""),
    characters: row?.characters?.trim() || null,
    slug: row?.slug?.trim() || null,
  };
}
