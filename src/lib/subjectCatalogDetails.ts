import { prisma } from "@/lib/prisma";
import { SUBJECT_TYPES, isSubjectType, type SubjectType } from "@/lib/domainConstants";
import type { JlptMeta } from "@/lib/jlptTypes";

const SUBJECT_DETAIL_CACHE_TTL_MS = 15 * 60 * 1000;
const SUBJECT_DETAIL_CACHE_MAX_ENTRIES = 4000;

type CachedSubjectDetail = {
  value: CatalogSubjectDetail;
  expiresAtMs: number;
  cachedAtMs: number;
};

const subjectDetailCache = new Map<number, CachedSubjectDetail>();

export type CatalogRelatedReference = {
  subjectId: number;
  label: string;
  wkLevel: number | null;
  reading: string | null;
  meaning: string | null;
};

export type CatalogSubjectDetail = {
  subjectId: number;
  subjectType: SubjectType;
  wkLevel: number;
  characters: string;
  meanings: string[];
  readings: string[];
  primaryReadings: string[];
  radicals: CatalogRelatedReference[];
  visuallySimilar: CatalogRelatedReference[];
  usedInVocabulary: CatalogRelatedReference[];
  componentKanji: CatalogRelatedReference[];
  meaningExplanation: string;
  readingExplanation: string;
  jlptLevel: number | null;
  jlptMeta: JlptMeta | null;
};

function pruneSubjectDetailCache(nowMs: number): void {
  for (const [subjectId, cached] of subjectDetailCache.entries()) {
    if (cached.expiresAtMs <= nowMs) {
      subjectDetailCache.delete(subjectId);
    }
  }

  if (subjectDetailCache.size <= SUBJECT_DETAIL_CACHE_MAX_ENTRIES) {
    return;
  }

  const keysByAge = Array.from(subjectDetailCache.entries())
    .sort((left, right) => left[1].cachedAtMs - right[1].cachedAtMs)
    .map(([subjectId]) => subjectId);

  const overflow = subjectDetailCache.size - SUBJECT_DETAIL_CACHE_MAX_ENTRIES;
  for (const subjectId of keysByAge.slice(0, overflow)) {
    subjectDetailCache.delete(subjectId);
  }
}

function readCachedSubjectDetail(subjectId: number, nowMs: number): CatalogSubjectDetail | null {
  const cached = subjectDetailCache.get(subjectId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAtMs <= nowMs) {
    subjectDetailCache.delete(subjectId);
    return null;
  }

  return cached.value;
}

function writeCachedSubjectDetail(subjectId: number, detail: CatalogSubjectDetail, nowMs: number): void {
  subjectDetailCache.set(subjectId, {
    value: detail,
    cachedAtMs: nowMs,
    expiresAtMs: nowMs + SUBJECT_DETAIL_CACHE_TTL_MS,
  });
}

type CatalogRow = {
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

function normalizeSubjectType(value: string): SubjectType {
  if (isSubjectType(value)) {
    return value;
  }

  return SUBJECT_TYPES.vocabulary;
}

function parseMeanings(raw: unknown): string[] {
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

function parseReadings(raw: unknown): { readings: string[]; primaryReadings: string[] } {
  if (!Array.isArray(raw)) {
    return { readings: [], primaryReadings: [] };
  }

  const readings: string[] = [];
  const primaryReadings: string[] = [];
  const seenReadings = new Set<string>();
  const seenPrimaryReadings = new Set<string>();

  for (const value of raw) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const row = value as { reading?: unknown; primary?: unknown; accepted_answer?: unknown };
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
  }

  return { readings, primaryReadings };
}

function primaryMeaning(raw: unknown): string | null {
  return parseMeanings(raw)[0] ?? null;
}

function primaryReading(raw: unknown): string | null {
  const { primaryReadings, readings } = parseReadings(raw);
  return primaryReadings[0] ?? readings[0] ?? null;
}

function subjectLabel(row: CatalogRow | undefined): string {
  if (!row) {
    return "-";
  }

  return row.characters?.trim() || row.slug?.trim() || String(row.wkSubjectId);
}

function toRelatedReference(
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
  };
}

function toJlptMeta(raw: {
  primaryMeaning: string | null;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  nanoriReadings: string[];
  wordExamples: unknown;
  strokeCount: number | null;
  frequencyRank: number | null;
  schoolGrade: number | null;
  heisigKeyword: string | null;
}): JlptMeta {
  return {
    primaryMeaning: raw.primaryMeaning,
    meanings: raw.meanings,
    onReadings: raw.onReadings,
    kunReadings: raw.kunReadings,
    nanoriReadings: raw.nanoriReadings,
    wordExamples: raw.wordExamples,
    strokeCount: raw.strokeCount,
    frequencyRank: raw.frequencyRank,
    schoolGrade: raw.schoolGrade,
    heisigKeyword: raw.heisigKeyword,
  };
}

function mapToCatalogRow(input: {
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
}): CatalogRow {
  return {
    wkSubjectId: input.wkSubjectId,
    subjectType: input.subjectType,
    level: input.level,
    slug: input.slug,
    characters: input.characters,
    meanings: input.meanings,
    readings: input.readings,
    componentSubjectIds: input.componentSubjectIds,
    amalgamationSubjectIds: input.amalgamationSubjectIds,
    visuallySimilarSubjectIds: input.visuallySimilarSubjectIds,
    meaningMnemonic: input.meaningMnemonic,
    readingMnemonic: input.readingMnemonic,
  };
}

export async function getCatalogSubjectDetails(
  subjectIds: number[],
): Promise<Map<number, CatalogSubjectDetail>> {
  const uniqueSubjectIds = Array.from(
    new Set(subjectIds.filter((subjectId) => Number.isInteger(subjectId) && subjectId > 0)),
  );
  if (uniqueSubjectIds.length === 0) {
    return new Map();
  }

  const nowMs = Date.now();
  pruneSubjectDetailCache(nowMs);

  const output = new Map<number, CatalogSubjectDetail>();
  const uncachedSubjectIds: number[] = [];

  for (const subjectId of uniqueSubjectIds) {
    const cached = readCachedSubjectDetail(subjectId, nowMs);
    if (cached) {
      output.set(subjectId, cached);
      continue;
    }

    uncachedSubjectIds.push(subjectId);
  }

  if (uncachedSubjectIds.length === 0) {
    return output;
  }

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { wkSubjectId: { in: uncachedSubjectIds } },
    select: {
      wkSubjectId: true,
      subjectType: true,
      level: true,
      slug: true,
      characters: true,
      meanings: true,
      readings: true,
      componentSubjectIds: true,
      amalgamationSubjectIds: true,
      visuallySimilarSubjectIds: true,
      meaningMnemonic: true,
      readingMnemonic: true,
    },
  });

  const rowMap = new Map<number, CatalogRow>();
  for (const row of rows) {
    rowMap.set(row.wkSubjectId, mapToCatalogRow(row));
  }

  const relatedSubjectIds = new Set<number>();
  for (const row of rows) {
    for (const subjectId of row.componentSubjectIds ?? []) {
      relatedSubjectIds.add(subjectId);
    }
    for (const subjectId of row.amalgamationSubjectIds ?? []) {
      relatedSubjectIds.add(subjectId);
    }
    for (const subjectId of row.visuallySimilarSubjectIds ?? []) {
      relatedSubjectIds.add(subjectId);
    }
  }

  const unresolvedRelatedIds = Array.from(relatedSubjectIds).filter((subjectId) => !rowMap.has(subjectId));
  if (unresolvedRelatedIds.length > 0) {
    const relatedRows = await prisma.wkSubjectCatalog.findMany({
      where: { wkSubjectId: { in: unresolvedRelatedIds } },
      select: {
        wkSubjectId: true,
        subjectType: true,
        level: true,
        slug: true,
        characters: true,
        meanings: true,
        readings: true,
        componentSubjectIds: true,
        amalgamationSubjectIds: true,
        visuallySimilarSubjectIds: true,
        meaningMnemonic: true,
        readingMnemonic: true,
      },
    });

    for (const row of relatedRows) {
      rowMap.set(row.wkSubjectId, mapToCatalogRow(row));
    }
  }

  const kanjiChars = rows
    .filter((row) => normalizeSubjectType(row.subjectType) === SUBJECT_TYPES.kanji)
    .map((row) => row.characters)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const jlptRows = kanjiChars.length
    ? await prisma.jlptKanji.findMany({
        where: { kanji: { in: kanjiChars } },
        select: {
          kanji: true,
          nLevel: true,
          primaryMeaning: true,
          meanings: true,
          onReadings: true,
          kunReadings: true,
          nanoriReadings: true,
          wordExamples: true,
          strokeCount: true,
          frequencyRank: true,
          schoolGrade: true,
          heisigKeyword: true,
        },
      })
    : [];

  const jlptByKanji = new Map(jlptRows.map((row) => [row.kanji, row]));

  for (const subjectId of uncachedSubjectIds) {
    const row = rowMap.get(subjectId);
    if (!row) {
      continue;
    }

    const subjectType = normalizeSubjectType(row.subjectType);
    const { readings, primaryReadings } = parseReadings(row.readings);
    const meanings = parseMeanings(row.meanings);

    const radicals =
      subjectType === SUBJECT_TYPES.kanji
        ? (row.componentSubjectIds ?? [])
            .filter((id) => normalizeSubjectType(rowMap.get(id)?.subjectType ?? "") === SUBJECT_TYPES.radical)
            .map((id) => toRelatedReference(id, rowMap, { useMeaningForReading: true }))
        : [];

    const componentKanji =
      subjectType === SUBJECT_TYPES.vocabulary
        ? (row.componentSubjectIds ?? [])
            .filter((id) => normalizeSubjectType(rowMap.get(id)?.subjectType ?? "") === SUBJECT_TYPES.kanji)
            .map((id) => toRelatedReference(id, rowMap))
        : [];

    const visuallySimilar =
      subjectType === SUBJECT_TYPES.kanji
        ? (row.visuallySimilarSubjectIds ?? []).map((id) => toRelatedReference(id, rowMap))
        : [];

    const usedInVocabulary =
      subjectType === SUBJECT_TYPES.kanji
        ? (row.amalgamationSubjectIds ?? [])
            .filter((id) => normalizeSubjectType(rowMap.get(id)?.subjectType ?? "") === SUBJECT_TYPES.vocabulary)
            .map((id) => toRelatedReference(id, rowMap))
        : subjectType === SUBJECT_TYPES.radical
          ? (row.amalgamationSubjectIds ?? [])
              .filter((id) => normalizeSubjectType(rowMap.get(id)?.subjectType ?? "") === SUBJECT_TYPES.kanji)
              .map((id) => toRelatedReference(id, rowMap))
          : [];

    const jlptRow = subjectType === SUBJECT_TYPES.kanji ? jlptByKanji.get(row.characters ?? "") : null;

    const detail: CatalogSubjectDetail = {
      subjectId,
      subjectType,
      wkLevel: row.level,
      characters: subjectLabel(row),
      meanings,
      readings,
      primaryReadings,
      radicals,
      visuallySimilar,
      usedInVocabulary,
      componentKanji,
      meaningExplanation: row.meaningMnemonic ?? "",
      readingExplanation: row.readingMnemonic ?? "",
      jlptLevel: jlptRow?.nLevel ?? null,
      jlptMeta: jlptRow
        ? toJlptMeta({
            primaryMeaning: jlptRow.primaryMeaning,
            meanings: jlptRow.meanings,
            onReadings: jlptRow.onReadings,
            kunReadings: jlptRow.kunReadings,
            nanoriReadings: jlptRow.nanoriReadings,
            wordExamples: jlptRow.wordExamples,
            strokeCount: jlptRow.strokeCount,
            frequencyRank: jlptRow.frequencyRank,
            schoolGrade: jlptRow.schoolGrade,
            heisigKeyword: jlptRow.heisigKeyword,
          })
        : null,
    };

    output.set(subjectId, detail);
    writeCachedSubjectDetail(subjectId, detail, nowMs);
  }

  return output;
}
