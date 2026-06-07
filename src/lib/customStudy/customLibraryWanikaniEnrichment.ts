import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";

import { readCustomItemRelationships, resolveCustomItemSubjectType, type CustomItemRelationships } from "./customItemMetadata";
import type { CustomLibraryItemPayload } from "./customStudyTypes";
import {
  decrementLevel,
  extractKanjiCharacters,
  isSingleWord,
  loadWkSubjectsByIds,
  loadWkSubjectsBySlugs,
  relationReferenceFromSubject,
  type WkSubject,
  uniqueReferences,
  uniqueStrings,
} from "./customLibraryWanikaniLookup";

const AUTO_ITEM_PREFIX = "auto:wk";
const MAX_WANIKANI_LEVEL = 60;
const SUBJECT_TYPE_ORDER: Record<SubjectType, number> = {
  [SUBJECT_TYPES.radical]: 0,
  [SUBJECT_TYPES.kanji]: 1,
  [SUBJECT_TYPES.vocabulary]: 2,
};

type SourceRef = {
  sourceItemId: string;
  sourceLevel: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeMetadata(existing: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {};
  const next = { ...base, ...patch };

  if (isRecord(base.relationships) && isRecord(patch.relationships)) {
    next.relationships = {
      ...base.relationships,
      ...patch.relationships,
    };
  }

  return next;
}

function readWkSubjectId(metadata: unknown): number | null {
  if (!isRecord(metadata) || !isRecord(metadata.wk) || typeof metadata.wk.subjectId !== "number") {
    return null;
  }

  const subjectId = metadata.wk.subjectId;
  return Number.isInteger(subjectId) && subjectId > 0 ? subjectId : null;
}

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.trunc(level));
}

function sourceMaxLevel(items: CustomLibraryItemPayload[]): number {
  return items.reduce((max, item) => Math.max(max, normalizeLevel(item.level)), 1);
}

function readWkSubjectLevel(metadata: unknown): number | null {
  if (!isRecord(metadata) || !isRecord(metadata.wk) || typeof metadata.wk.level !== "number") {
    return null;
  }

  return Math.max(1, Math.min(MAX_WANIKANI_LEVEL, Math.trunc(metadata.wk.level)));
}

function rebalanceAutoItemLevels(params: {
  sourceItems: CustomLibraryItemPayload[];
  autoItems: CustomLibraryItemPayload[];
}): CustomLibraryItemPayload[] {
  if (params.autoItems.length === 0) {
    return params.autoItems;
  }

  const maxSourceLevel = sourceMaxLevel(params.sourceItems);
  if (maxSourceLevel <= 1) {
    return params.autoItems;
  }

  const sorted = [...params.autoItems].sort((left, right) => {
    const leftWkLevel = readWkSubjectLevel(left.metadata) ?? normalizeLevel(left.level);
    const rightWkLevel = readWkSubjectLevel(right.metadata) ?? normalizeLevel(right.level);
    if (leftWkLevel !== rightWkLevel) {
      return leftWkLevel - rightWkLevel;
    }

    const leftTypeOrder = SUBJECT_TYPE_ORDER[resolveCustomItemSubjectType(left.type, left.metadata)];
    const rightTypeOrder = SUBJECT_TYPE_ORDER[resolveCustomItemSubjectType(right.type, right.metadata)];
    if (leftTypeOrder !== rightTypeOrder) {
      return leftTypeOrder - rightTypeOrder;
    }

    const byCharacters = left.characters.localeCompare(right.characters, undefined, { sensitivity: "base" });
    if (byCharacters !== 0) {
      return byCharacters;
    }

    return left.id.localeCompare(right.id, undefined, { sensitivity: "base" });
  });

  const total = sorted.length;
  return sorted.map((item, index) => {
    const balancedLevel = Math.min(maxSourceLevel, Math.floor((index * maxSourceLevel) / total) + 1);
    if (item.level === balancedLevel) {
      return item;
    }

    return {
      ...item,
      level: balancedLevel,
    };
  });
}

export async function enrichCustomLibraryItemsWithWaniKani(params: {
  token: string;
  items: CustomLibraryItemPayload[];
}): Promise<CustomLibraryItemPayload[]> {
  if (params.items.length === 0) {
    return params.items;
  }

  const sourceItems = params.items.filter((item) => !item.id.startsWith(AUTO_ITEM_PREFIX));
  const existingAutoItems = params.items.filter((item) => item.id.startsWith(AUTO_ITEM_PREFIX));

  const sourceRefsByKanji = new Map<string, SourceRef[]>();
  const allKanjiCharacters = new Set<string>();

  for (const item of sourceItems) {
    for (const character of extractKanjiCharacters(item.characters)) {
      allKanjiCharacters.add(character);
      const refs = sourceRefsByKanji.get(character) ?? [];
      refs.push({ sourceItemId: item.id, sourceLevel: item.level });
      sourceRefsByKanji.set(character, refs);
    }
  }

  if (allKanjiCharacters.size === 0) {
    return params.items;
  }

  const wkKanjiByCharacter = await loadWkSubjectsBySlugs({
    token: params.token,
    subjectType: SUBJECT_TYPES.kanji,
    slugs: Array.from(allKanjiCharacters.values()),
  });

  if (wkKanjiByCharacter.size === 0) {
    return params.items;
  }

  const relatedSubjectIds = new Set<number>();
  for (const subject of wkKanjiByCharacter.values()) {
    for (const id of subject.componentSubjectIds) {
      relatedSubjectIds.add(id);
    }

    for (const id of subject.visuallySimilarSubjectIds) {
      relatedSubjectIds.add(id);
    }

    for (const id of subject.amalgamationSubjectIds) {
      relatedSubjectIds.add(id);
    }
  }

  const relatedSubjectsById = await loadWkSubjectsByIds({
    token: params.token,
    ids: Array.from(relatedSubjectIds.values()),
  });

  const kanjiRelationshipsByCharacter = new Map<string, CustomItemRelationships>();
  for (const [character, subject] of wkKanjiByCharacter.entries()) {
    const radicals = uniqueReferences(
      subject.componentSubjectIds
        .map((id) => relatedSubjectsById.get(id))
        .filter((row): row is WkSubject => row !== undefined && row.object === SUBJECT_TYPES.radical)
        .map(relationReferenceFromSubject),
    );
    const visuallySimilar = uniqueReferences(
      subject.visuallySimilarSubjectIds
        .map((id) => relatedSubjectsById.get(id))
        .filter((row): row is WkSubject => row !== undefined)
        .map(relationReferenceFromSubject),
    );
    const usedInVocabulary = uniqueReferences(
      subject.amalgamationSubjectIds
        .map((id) => relatedSubjectsById.get(id))
        .filter((row): row is WkSubject => row !== undefined && row.object === SUBJECT_TYPES.vocabulary)
        .map(relationReferenceFromSubject),
    );

    kanjiRelationshipsByCharacter.set(character, {
      radicals,
      visuallySimilar,
      usedInVocabulary,
      componentKanji: [],
    });
  }

  const enrichedSourceItems = sourceItems.map((item) => {
    const sourceKanji = extractKanjiCharacters(item.characters)
      .map((character) => wkKanjiByCharacter.get(character))
      .filter((row): row is WkSubject => row !== undefined);

    const componentKanji = uniqueReferences(sourceKanji.map(relationReferenceFromSubject));
    const radicals = uniqueReferences(
      sourceKanji.flatMap((subject) => {
        const relationships = kanjiRelationshipsByCharacter.get(subject.characters ?? "");
        return relationships?.radicals ?? [];
      }),
    );

    const isKanjiItem = item.type === "kanji" && sourceKanji.length > 0;
    const shouldAttachRadicals = sourceKanji.length > 0 && (isKanjiItem || isSingleWord(item.characters));

    if (!isKanjiItem && componentKanji.length === 0 && !shouldAttachRadicals) {
      return item;
    }

    const primaryKanjiSubject = isKanjiItem ? sourceKanji[0] ?? null : null;
    const wkPatch = primaryKanjiSubject
      ? {
          wk: {
            source: "wanikani",
            subjectId: primaryKanjiSubject.subjectId,
            object: primaryKanjiSubject.object,
            level: primaryKanjiSubject.level,
            slug: primaryKanjiSubject.slug,
          },
        }
      : {};

    const existingRelationships = readCustomItemRelationships(item.metadata);
    const relationshipPatch: CustomItemRelationships = {
      radicals: shouldAttachRadicals ? radicals : existingRelationships.radicals,
      visuallySimilar: isKanjiItem
        ? kanjiRelationshipsByCharacter.get(primaryKanjiSubject?.characters ?? "")?.visuallySimilar ?? []
        : existingRelationships.visuallySimilar,
      usedInVocabulary: isKanjiItem
        ? kanjiRelationshipsByCharacter.get(primaryKanjiSubject?.characters ?? "")?.usedInVocabulary ?? []
        : existingRelationships.usedInVocabulary,
      componentKanji,
    };

    const metadata = mergeMetadata(item.metadata, {
      ...wkPatch,
      relationships: relationshipPatch,
    });

    return {
      ...item,
      metadata,
    };
  });

  const existingByGlyph = new Set<string>();
  const existingByWkSubject = new Set<string>();

  for (const item of [...enrichedSourceItems, ...existingAutoItems]) {
    const subjectType = resolveCustomItemSubjectType(item.type, item.metadata);
    existingByGlyph.add(`${subjectType}:${item.characters.trim()}`);

    const wkSubjectId = readWkSubjectId(item.metadata);
    if (wkSubjectId) {
      existingByWkSubject.add(`${subjectType}:${wkSubjectId}`);
    }
  }

  const autoKanjiItems: CustomLibraryItemPayload[] = [];

  for (const [character, subject] of wkKanjiByCharacter.entries()) {
    if (existingByWkSubject.has(`${SUBJECT_TYPES.kanji}:${subject.subjectId}`)) {
      continue;
    }

    const glyph = (subject.characters ?? character).trim();
    if (!glyph || existingByGlyph.has(`${SUBJECT_TYPES.kanji}:${glyph}`)) {
      continue;
    }

    const sourceRefs = sourceRefsByKanji.get(character) ?? [];
    if (sourceRefs.length === 0) {
      continue;
    }

    const earliestLevel = Math.min(...sourceRefs.map((row) => row.sourceLevel));
    const relationships = kanjiRelationshipsByCharacter.get(character) ?? {
      radicals: [],
      visuallySimilar: [],
      usedInVocabulary: [],
      componentKanji: [],
    };

    autoKanjiItems.push({
      id: `${AUTO_ITEM_PREFIX}:kanji:${subject.subjectId}`,
      type: "kanji",
      level: decrementLevel(earliestLevel),
      characters: glyph,
      meanings: subject.meanings.length > 0 ? subject.meanings : [subject.primaryMeaning ?? glyph],
      readings: subject.readings,
      primaryReading: subject.primaryReading ?? undefined,
      meaningMnemonic: subject.meaningMnemonic ?? undefined,
      readingMnemonic: subject.readingMnemonic ?? undefined,
      synonyms: [],
      metadata: {
        wk: {
          source: "wanikani",
          subjectId: subject.subjectId,
          object: subject.object,
          level: subject.level,
          slug: subject.slug,
        },
        autoGeneratedFrom: uniqueStrings(sourceRefs.map((row) => row.sourceItemId)),
        relationships,
      },
    });

    existingByGlyph.add(`${SUBJECT_TYPES.kanji}:${glyph}`);
    existingByWkSubject.add(`${SUBJECT_TYPES.kanji}:${subject.subjectId}`);
  }

  const radicalSourceRefsById = new Map<number, SourceRef[]>();
  for (const item of enrichedSourceItems) {
    const sourceKanji = extractKanjiCharacters(item.characters)
      .map((character) => wkKanjiByCharacter.get(character))
      .filter((row): row is WkSubject => row !== undefined);

    const shouldExtractRadicals = sourceKanji.length > 0 && (item.type === "kanji" || isSingleWord(item.characters));
    if (!shouldExtractRadicals) {
      continue;
    }

    for (const subject of sourceKanji) {
      const relationships = kanjiRelationshipsByCharacter.get(subject.characters ?? "");
      for (const radical of relationships?.radicals ?? []) {
        const refs = radicalSourceRefsById.get(radical.subjectId) ?? [];
        refs.push({ sourceItemId: item.id, sourceLevel: item.level });
        radicalSourceRefsById.set(radical.subjectId, refs);
      }
    }
  }

  const autoRadicalItems: CustomLibraryItemPayload[] = [];

  for (const [radicalId, sourceRefs] of radicalSourceRefsById.entries()) {
    const radical = relatedSubjectsById.get(radicalId);
    if (!radical || radical.object !== SUBJECT_TYPES.radical) {
      continue;
    }

    if (existingByWkSubject.has(`${SUBJECT_TYPES.radical}:${radical.subjectId}`)) {
      continue;
    }

    const glyph = (radical.characters ?? radical.slug ?? `#${radical.subjectId}`).trim();
    if (existingByGlyph.has(`${SUBJECT_TYPES.radical}:${glyph}`)) {
      continue;
    }

    const earliestLevel = Math.min(...sourceRefs.map((row) => row.sourceLevel));
    const componentKanji = uniqueReferences(
      radical.amalgamationSubjectIds
        .map((id) => relatedSubjectsById.get(id))
        .filter((row): row is WkSubject => row !== undefined && row.object === SUBJECT_TYPES.kanji)
        .map(relationReferenceFromSubject),
    );

    autoRadicalItems.push({
      id: `${AUTO_ITEM_PREFIX}:radical:${radical.subjectId}`,
      type: "vocabulary",
      level: decrementLevel(earliestLevel),
      characters: glyph,
      meanings: radical.meanings.length > 0 ? radical.meanings : [radical.primaryMeaning ?? glyph],
      readings: [],
      primaryReading: undefined,
      meaningMnemonic: radical.meaningMnemonic ?? undefined,
      readingMnemonic: undefined,
      synonyms: [],
      metadata: {
        customSubjectType: SUBJECT_TYPES.radical,
        wk: {
          source: "wanikani",
          subjectId: radical.subjectId,
          object: radical.object,
          level: radical.level,
          slug: radical.slug,
        },
        autoGeneratedFrom: uniqueStrings(sourceRefs.map((row) => row.sourceItemId)),
        relationships: {
          radicals: [],
          visuallySimilar: [],
          usedInVocabulary: [],
          componentKanji,
        },
      },
    });

    existingByGlyph.add(`${SUBJECT_TYPES.radical}:${glyph}`);
    existingByWkSubject.add(`${SUBJECT_TYPES.radical}:${radical.subjectId}`);
  }

  const rebalancedAutoItems = rebalanceAutoItemLevels({
    sourceItems: enrichedSourceItems,
    autoItems: [...existingAutoItems, ...autoKanjiItems, ...autoRadicalItems],
  });

  return [...enrichedSourceItems, ...rebalancedAutoItems].sort((left, right) => {
    if (left.level !== right.level) {
      return left.level - right.level;
    }

    const leftTypeOrder = SUBJECT_TYPE_ORDER[resolveCustomItemSubjectType(left.type, left.metadata)];
    const rightTypeOrder = SUBJECT_TYPE_ORDER[resolveCustomItemSubjectType(right.type, right.metadata)];
    if (leftTypeOrder !== rightTypeOrder) {
      return leftTypeOrder - rightTypeOrder;
    }

    const byCharacters = left.characters.localeCompare(right.characters, undefined, { sensitivity: "base" });
    if (byCharacters !== 0) {
      return byCharacters;
    }

    return left.id.localeCompare(right.id, undefined, { sensitivity: "base" });
  });
}
