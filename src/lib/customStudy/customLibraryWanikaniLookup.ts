import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import { normalizeAssignmentType } from "@/lib/wanikani/helpers";
import { fetchAllCollectionPages } from "@/lib/wanikani/http";

import type { CustomItemRelationReference } from "./customItemMetadata";

const KANJI_CHAR_REGEX = /[\p{Script=Han}]/gu;
const WK_SUBJECT_IDS_CHUNK_SIZE = 200;
const WK_SUBJECT_SLUGS_CHUNK_SIZE = 80;

export type WkSubject = {
  subjectId: number;
  object: SubjectType;
  level: number;
  slug: string | null;
  characters: string | null;
  meanings: string[];
  primaryMeaning: string | null;
  readings: string[];
  primaryReading: string | null;
  meaningMnemonic: string | null;
  readingMnemonic: string | null;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function uniqueStrings(input: string[]): string[] {
  return Array.from(new Set(input.map((value) => value.trim()).filter(Boolean)));
}

export function uniqueReferences(input: CustomItemRelationReference[]): CustomItemRelationReference[] {
  const seen = new Set<string>();
  const output: CustomItemRelationReference[] = [];

  for (const item of input) {
    const key = `${item.subjectId}:${item.subjectType ?? "unknown"}:${item.label}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

export function extractKanjiCharacters(value: string): string[] {
  return uniqueStrings(value.match(KANJI_CHAR_REGEX) ?? []);
}

export function isSingleWord(value: string): boolean {
  return !/\s/u.test(value.trim());
}

export function decrementLevel(level: number): number {
  return Math.max(1, Math.trunc(level) - 1);
}

function parseWkSubject(row: { id: number; object?: string; data: Record<string, unknown> }): WkSubject | null {
  const object = normalizeAssignmentType(row.object ?? "");
  if (!object) {
    return null;
  }

  const data = row.data;
  const level = typeof data.level === "number" && Number.isFinite(data.level) ? Math.max(1, Math.trunc(data.level)) : 1;

  const meanings = Array.isArray(data.meanings)
    ? data.meanings
        .map((item) => (isRecord(item) && typeof item.meaning === "string" ? item.meaning.trim() : ""))
        .filter(Boolean)
    : [];
  const primaryMeaning = Array.isArray(data.meanings)
    ? data.meanings
        .map((item) => {
          if (!isRecord(item) || typeof item.meaning !== "string") {
            return null;
          }

          const isPrimary = item.primary === true || typeof item.primary !== "boolean";
          return isPrimary ? item.meaning.trim() : null;
        })
        .find((value): value is string => typeof value === "string" && value.length > 0) ?? null
    : null;

  const readings = Array.isArray(data.readings)
    ? data.readings
        .map((item) => {
          if (!isRecord(item) || typeof item.reading !== "string") {
            return null;
          }

          if (item.accepted_answer === false) {
            return null;
          }

          return item.reading.trim();
        })
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  const primaryReading = Array.isArray(data.readings)
    ? data.readings
        .map((item) => {
          if (!isRecord(item) || typeof item.reading !== "string") {
            return null;
          }

          if (item.primary !== true || item.accepted_answer === false) {
            return null;
          }

          return item.reading.trim();
        })
        .find((value): value is string => typeof value === "string" && value.length > 0) ?? null
    : null;

  const toIdList = (value: unknown): number[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => typeof item === "number" && Number.isInteger(item) && item > 0)
      .map((item) => item as number);
  };

  const slug = typeof data.slug === "string" ? data.slug.trim() : null;
  const characters = typeof data.characters === "string" ? data.characters.trim() : null;

  return {
    subjectId: row.id,
    object,
    level,
    slug: slug && slug.length > 0 ? slug : null,
    characters: characters && characters.length > 0 ? characters : null,
    meanings: uniqueStrings(meanings),
    primaryMeaning,
    readings: uniqueStrings(readings),
    primaryReading,
    meaningMnemonic: typeof data.meaning_mnemonic === "string" ? data.meaning_mnemonic.trim() : null,
    readingMnemonic: typeof data.reading_mnemonic === "string" ? data.reading_mnemonic.trim() : null,
    componentSubjectIds: toIdList(data.component_subject_ids),
    amalgamationSubjectIds: toIdList(data.amalgamation_subject_ids),
    visuallySimilarSubjectIds: toIdList(data.visually_similar_subject_ids),
  };
}

export async function loadWkSubjectsBySlugs(params: {
  token: string;
  subjectType: SubjectType;
  slugs: string[];
}): Promise<Map<string, WkSubject>> {
  const output = new Map<string, WkSubject>();

  for (let index = 0; index < params.slugs.length; index += WK_SUBJECT_SLUGS_CHUNK_SIZE) {
    const chunk = params.slugs.slice(index, index + WK_SUBJECT_SLUGS_CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const collection = await fetchAllCollectionPages(
      `/subjects?types=${params.subjectType}&slugs=${encodeURIComponent(chunk.join(","))}`,
      params.token,
    );

    for (const row of collection.data) {
      const parsed = parseWkSubject({ id: row.id, object: row.object, data: row.data });
      if (!parsed) {
        continue;
      }

      const key = (parsed.characters ?? parsed.slug ?? "").trim();
      if (!key) {
        continue;
      }

      output.set(key, parsed);
    }
  }

  return output;
}

export async function loadWkSubjectsByIds(params: {
  token: string;
  ids: number[];
}): Promise<Map<number, WkSubject>> {
  const output = new Map<number, WkSubject>();
  const uniqueIds = Array.from(new Set(params.ids.filter((id) => Number.isInteger(id) && id > 0)));

  for (let index = 0; index < uniqueIds.length; index += WK_SUBJECT_IDS_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(index, index + WK_SUBJECT_IDS_CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const collection = await fetchAllCollectionPages(`/subjects?ids=${chunk.join(",")}`, params.token);
    for (const row of collection.data) {
      const parsed = parseWkSubject({ id: row.id, object: row.object, data: row.data });
      if (!parsed) {
        continue;
      }

      output.set(parsed.subjectId, parsed);
    }
  }

  return output;
}

export function relationReferenceFromSubject(subject: WkSubject): CustomItemRelationReference {
  const label = (subject.characters ?? subject.slug ?? `#${subject.subjectId}`).trim();

  return {
    subjectId: subject.subjectId,
    label: label.length > 0 ? label : `#${subject.subjectId}`,
    wkLevel: subject.level,
    reading: subject.object === SUBJECT_TYPES.radical ? subject.primaryMeaning : subject.primaryReading,
    subjectType: subject.object,
  };
}
