import { fetchAllCollectionPages } from "@/lib/wanikani/http";
import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";

type NewsLookupSubjectType = Extract<
  SubjectType,
  typeof SUBJECT_TYPES.kanji | typeof SUBJECT_TYPES.vocabulary
>;

export type LookupGlyphItem = {
  text: string;
  subjectType: NewsLookupSubjectType;
  subjectId: number | null;
  meanings: string[];
  readings: string[];
  primaryReadings: string[];
  meaningExplanation: string;
  readingExplanation: string;
  wkLevel: number | null;
  radicals: LookupRelatedReference[];
  visuallySimilar: LookupRelatedReference[];
  usedInVocabulary: LookupRelatedReference[];
  componentKanji: LookupRelatedReference[];
};

export type LookupRelatedReference = {
  subjectId: number;
  label: string;
  wkLevel: number | null;
  reading: string | null;
  meaning: string | null;
};

export type LookupRunResult = {
  vocabulary: LookupGlyphItem | null;
  kanjiItems: LookupGlyphItem[];
  missingChars: string[];
};

const CHUNK_SIZE = 60;

type SubjectSummary = {
  object: string;
  label: string;
  wkLevel: number | null;
  primaryReading: string | null;
  primaryMeaning: string | null;
};

type LookupSubjectRowData = {
  characters?: string | null;
  slug?: string | null;
  level?: number | null;
  meanings?: Array<{ meaning?: string; primary?: boolean }>;
  readings?: Array<{ reading?: string; primary?: boolean; accepted_answer?: boolean }>;
  meaning_mnemonic?: string;
  reading_mnemonic?: string;
  component_subject_ids?: number[];
  amalgamation_subject_ids?: number[];
  visually_similar_subject_ids?: number[];
};

type ResolvedLookupSubject = {
  subjectId: number;
  text: string;
  subjectType: NewsLookupSubjectType;
  meanings: string[];
  readings: string[];
  primaryReadings: string[];
  meaningExplanation: string;
  readingExplanation: string;
  wkLevel: number | null;
  componentSubjectIds: number[];
  amalgamationSubjectIds: number[];
  visuallySimilarSubjectIds: number[];
};

export async function lookupRunInWaniKani(run: string, token: string): Promise<LookupRunResult> {
  const vocabulary = await lookupVocabulary(run, token);
  const chars = Array.from(run).filter((char) => char.trim().length > 0);
  const kanjiItems = await lookupKanjiByChars(chars, token);
  const missingChars = kanjiItems.filter((item) => item.subjectId === null).map((item) => item.text);

  return {
    vocabulary,
    kanjiItems,
    missingChars,
  };
}

export async function lookupKanjiLevelsByChars(
  chars: string[],
  token: string,
): Promise<Record<string, number | null>> {
  const items = await lookupKanjiByChars(chars, token);
  const out: Record<string, number | null> = {};
  for (const item of items) {
    out[item.text] = typeof item.wkLevel === "number" ? item.wkLevel : null;
  }
  return out;
}

async function lookupVocabulary(run: string, token: string): Promise<LookupGlyphItem | null> {
  const value = run.trim();
  if (!value) {
    return null;
  }

  const collection = await fetchAllCollectionPages(
    `/subjects?types=${SUBJECT_TYPES.vocabulary}&slugs=${encodeURIComponent(value)}`,
    token,
  );

  for (const row of collection.data) {
    if ((row.object ?? "") !== SUBJECT_TYPES.vocabulary) {
      continue;
    }
    const data = row.data as LookupSubjectRowData;

    const text = data.characters ?? "";
    if (!text || text !== value) {
      continue;
    }

    const readings = (data.readings ?? [])
      .map((reading) => reading.reading)
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);

    const primaryReadings = (data.readings ?? [])
      .filter((reading) => reading.primary)
      .map((reading) => reading.reading)
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);

    const meanings = (data.meanings ?? [])
      .map((entry) => entry.meaning)
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .slice(0, 3);

    const relatedById = await loadSubjectSummaries(token, data.component_subject_ids ?? []);
    const componentKanji = (data.component_subject_ids ?? [])
      .filter((subjectId) => relatedById.get(subjectId)?.object === SUBJECT_TYPES.kanji)
      .map((subjectId) => toRelatedReference(subjectId, relatedById));

    return {
      text,
      subjectType: SUBJECT_TYPES.vocabulary,
      subjectId: row.id,
      meanings,
      readings,
      primaryReadings,
      meaningExplanation: data.meaning_mnemonic ?? "",
      readingExplanation: data.reading_mnemonic ?? "",
      wkLevel: typeof data.level === "number" ? data.level : null,
      radicals: [],
      visuallySimilar: [],
      usedInVocabulary: [],
      componentKanji,
    };
  }

  return null;
}

async function lookupKanjiByChars(
  chars: string[],
  token: string,
): Promise<LookupGlyphItem[]> {
  const unique = Array.from(new Set(chars.filter((char) => char && char.length === 1)));
  if (unique.length === 0) {
    return [];
  }

  const subjects = new Map<string, ResolvedLookupSubject>();

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const slugs = chunk.map((char) => encodeURIComponent(char)).join(",");
    const collection = await fetchAllCollectionPages(
      `/subjects?types=${SUBJECT_TYPES.kanji}&slugs=${slugs}`,
      token,
    );

    for (const row of collection.data) {
      if ((row.object ?? "") !== SUBJECT_TYPES.kanji) {
        continue;
      }

      const data = row.data as LookupSubjectRowData;

      const characters = data.characters ?? "";
      if (!characters) {
        continue;
      }

      const readings = (data.readings ?? [])
        .map((reading) => reading.reading)
        .filter((value): value is string => typeof value === "string" && value.length > 0);

      const primaryReadings = (data.readings ?? [])
        .filter((reading) => reading.primary)
        .map((reading) => reading.reading)
        .filter((value): value is string => typeof value === "string" && value.length > 0);

      const meanings = (data.meanings ?? [])
        .map((entry) => entry.meaning)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .slice(0, 3);

      subjects.set(characters, {
        subjectId: row.id,
        text: characters,
        subjectType: SUBJECT_TYPES.kanji,
        meanings,
        readings,
        primaryReadings,
        meaningExplanation: data.meaning_mnemonic ?? "",
        readingExplanation: data.reading_mnemonic ?? "",
        wkLevel: typeof data.level === "number" ? data.level : null,
        componentSubjectIds: data.component_subject_ids ?? [],
        amalgamationSubjectIds: data.amalgamation_subject_ids ?? [],
        visuallySimilarSubjectIds: data.visually_similar_subject_ids ?? [],
      });
    }
  }

  const relatedIds = new Set<number>();
  for (const subject of subjects.values()) {
    for (const subjectId of subject.componentSubjectIds) {
      relatedIds.add(subjectId);
    }
    for (const subjectId of subject.amalgamationSubjectIds) {
      relatedIds.add(subjectId);
    }
    for (const subjectId of subject.visuallySimilarSubjectIds) {
      relatedIds.add(subjectId);
    }
  }

  const relatedById = await loadSubjectSummaries(token, Array.from(relatedIds));

  return unique.map(
    (char) => {
      const subject = subjects.get(char);
      if (!subject) {
        return {
        text: char,
        subjectType: SUBJECT_TYPES.kanji,
        subjectId: null,
        meanings: [],
        readings: [],
        primaryReadings: [],
        meaningExplanation: "",
        readingExplanation: "",
        wkLevel: null,
        radicals: [],
        visuallySimilar: [],
        usedInVocabulary: [],
        componentKanji: [],
      };
      }

      const radicals = subject.componentSubjectIds
        .filter((subjectId) => relatedById.get(subjectId)?.object === SUBJECT_TYPES.radical)
        .map((subjectId) => toRelatedReference(subjectId, relatedById, { useMeaningForReading: true }));
      const visuallySimilar = subject.visuallySimilarSubjectIds
        .map((subjectId) => toRelatedReference(subjectId, relatedById));
      const usedInVocabulary = subject.amalgamationSubjectIds
        .filter((subjectId) => relatedById.get(subjectId)?.object === SUBJECT_TYPES.vocabulary)
        .map((subjectId) => toRelatedReference(subjectId, relatedById));

      return {
        text: subject.text,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        meanings: subject.meanings,
        readings: subject.readings,
        primaryReadings: subject.primaryReadings,
        meaningExplanation: subject.meaningExplanation,
        readingExplanation: subject.readingExplanation,
        wkLevel: subject.wkLevel,
        radicals,
        visuallySimilar,
        usedInVocabulary,
        componentKanji: [],
      };
    },
  );
}

async function loadSubjectSummaries(token: string, subjectIds: number[]): Promise<Map<number, SubjectSummary>> {
  const output = new Map<number, SubjectSummary>();
  const uniqueSubjectIds = Array.from(new Set(subjectIds.filter((subjectId) => Number.isInteger(subjectId) && subjectId > 0)));

  for (let i = 0; i < uniqueSubjectIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueSubjectIds.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const collection = await fetchAllCollectionPages(`/subjects?ids=${chunk.join(",")}`, token);
    for (const row of collection.data) {
      const data = row.data as LookupSubjectRowData;
      output.set(row.id, {
        object: row.object ?? "subject",
        label: data.characters ?? data.slug ?? String(row.id),
        wkLevel: typeof data.level === "number" ? data.level : null,
        primaryReading: firstPrimaryReading(data.readings),
        primaryMeaning: firstPrimaryMeaning(data.meanings),
      });
    }
  }

  return output;
}

function firstPrimaryReading(
  readings: Array<{ reading?: string; primary?: boolean; accepted_answer?: boolean }> | undefined,
): string | null {
  return (
    readings
      ?.filter((reading) => reading.primary && (reading.accepted_answer ?? true))
      .map((reading) => reading.reading)
      .find((reading): reading is string => typeof reading === "string" && reading.length > 0) ?? null
  );
}

function firstPrimaryMeaning(
  meanings: Array<{ meaning?: string; primary?: boolean }> | undefined,
): string | null {
  return (
    meanings
      ?.filter((meaning) => meaning.primary ?? true)
      .map((meaning) => meaning.meaning)
      .find((meaning): meaning is string => typeof meaning === "string" && meaning.length > 0) ?? null
  );
}

function toRelatedReference(
  subjectId: number,
  relatedById: Map<number, SubjectSummary>,
  options?: { useMeaningForReading?: boolean },
): LookupRelatedReference {
  const related = relatedById.get(subjectId);
  return {
    subjectId,
    label: related?.label ?? String(subjectId),
    wkLevel: related?.wkLevel ?? null,
    reading: options?.useMeaningForReading ? (related?.primaryMeaning ?? null) : (related?.primaryReading ?? null),
    meaning: related?.primaryMeaning ?? null,
  };
}
