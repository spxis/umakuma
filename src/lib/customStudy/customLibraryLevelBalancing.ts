import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";

import { resolveCustomItemSubjectType } from "./customItemMetadata";
import type { CustomLibraryItemPayload } from "./customStudyTypes";

const MAX_WANIKANI_LEVEL = 60;
const MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE = 20;
const CAPPED_SUBJECT_TYPES = [
  SUBJECT_TYPES.radical,
  SUBJECT_TYPES.kanji,
  SUBJECT_TYPES.vocabulary,
] as const;

const SUBJECT_TYPE_ORDER: Record<SubjectType, number> = {
  [SUBJECT_TYPES.radical]: 0,
  [SUBJECT_TYPES.kanji]: 1,
  [SUBJECT_TYPES.vocabulary]: 2,
};

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.trunc(level));
}

function sourceMaxLevel(items: CustomLibraryItemPayload[]): number {
  return items.reduce((max, item) => Math.max(max, normalizeLevel(item.level)), 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readWkSubjectLevel(metadata: unknown): number | null {
  if (!isRecord(metadata) || !isRecord(metadata.wk) || typeof metadata.wk.level !== "number") {
    return null;
  }

  return Math.max(1, Math.min(MAX_WANIKANI_LEVEL, Math.trunc(metadata.wk.level)));
}

function compareAutoItemPriority(left: CustomLibraryItemPayload, right: CustomLibraryItemPayload): number {
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
}

function emptySubjectTypeCounts(): Record<SubjectType, number> {
  return {
    [SUBJECT_TYPES.radical]: 0,
    [SUBJECT_TYPES.kanji]: 0,
    [SUBJECT_TYPES.vocabulary]: 0,
  };
}

function countByLevelAndSubjectType(items: CustomLibraryItemPayload[]): Map<number, Record<SubjectType, number>> {
  const out = new Map<number, Record<SubjectType, number>>();

  for (const item of items) {
    const level = normalizeLevel(item.level);
    const subjectType = resolveCustomItemSubjectType(item.type, item.metadata);
    const counts = out.get(level) ?? emptySubjectTypeCounts();
    counts[subjectType] += 1;
    out.set(level, counts);
  }

  return out;
}

export function rebalanceAutoItemLevels(params: {
  sourceItems: CustomLibraryItemPayload[];
  autoItems: CustomLibraryItemPayload[];
}): CustomLibraryItemPayload[] {
  if (params.autoItems.length === 0) {
    return params.autoItems;
  }

  const maxSourceLevel = sourceMaxLevel(params.sourceItems);
  const sourceCountsByLevel = countByLevelAndSubjectType(params.sourceItems);

  const autoItemsBySubjectType: Record<SubjectType, CustomLibraryItemPayload[]> = {
    [SUBJECT_TYPES.radical]: [],
    [SUBJECT_TYPES.kanji]: [],
    [SUBJECT_TYPES.vocabulary]: [],
  };

  for (const item of params.autoItems) {
    const subjectType = resolveCustomItemSubjectType(item.type, item.metadata);
    autoItemsBySubjectType[subjectType].push(item);
  }

  const baseTypeCapacity: Record<SubjectType, number> = {
    [SUBJECT_TYPES.radical]: 0,
    [SUBJECT_TYPES.kanji]: 0,
    [SUBJECT_TYPES.vocabulary]: 0,
  };

  for (let level = 1; level <= maxSourceLevel; level += 1) {
    const sourceCounts = sourceCountsByLevel.get(level) ?? emptySubjectTypeCounts();
    for (const subjectType of CAPPED_SUBJECT_TYPES) {
      baseTypeCapacity[subjectType] += Math.max(
        0,
        MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE - sourceCounts[subjectType],
      );
    }
  }

  const neededExtraLevels = Math.max(
    ...CAPPED_SUBJECT_TYPES.map((subjectType) => {
      const overflow = Math.max(0, autoItemsBySubjectType[subjectType].length - baseTypeCapacity[subjectType]);
      return Math.ceil(overflow / MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE);
    }),
  );

  let maxBalancedLevel = Math.max(1, maxSourceLevel + neededExtraLevels);
  const availableSlotsByLevel = new Map<number, Record<SubjectType, number>>();
  for (let level = 1; level <= maxBalancedLevel; level += 1) {
    const sourceCounts = sourceCountsByLevel.get(level) ?? emptySubjectTypeCounts();
    availableSlotsByLevel.set(level, {
      [SUBJECT_TYPES.radical]: Math.max(0, MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE - sourceCounts[SUBJECT_TYPES.radical]),
      [SUBJECT_TYPES.kanji]: Math.max(0, MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE - sourceCounts[SUBJECT_TYPES.kanji]),
      [SUBJECT_TYPES.vocabulary]: Math.max(0, MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE - sourceCounts[SUBJECT_TYPES.vocabulary]),
    });
  }

  const assigned: CustomLibraryItemPayload[] = [];

  for (const subjectType of CAPPED_SUBJECT_TYPES) {
    const sorted = [...autoItemsBySubjectType[subjectType]].sort(compareAutoItemPriority);
    let levelCursor = 1;

    for (const item of sorted) {
      while (levelCursor <= maxBalancedLevel) {
        const slots = availableSlotsByLevel.get(levelCursor);
        if (slots && slots[subjectType] > 0) {
          break;
        }

        levelCursor += 1;
      }

      if (levelCursor > maxBalancedLevel) {
        maxBalancedLevel += 1;
        availableSlotsByLevel.set(maxBalancedLevel, {
          [SUBJECT_TYPES.radical]: MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE,
          [SUBJECT_TYPES.kanji]: MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE,
          [SUBJECT_TYPES.vocabulary]: MAX_ITEMS_PER_LEVEL_PER_SUBJECT_TYPE,
        });
        levelCursor = maxBalancedLevel;
      }

      const slots = availableSlotsByLevel.get(levelCursor);
      if (!slots) {
        continue;
      }

      slots[subjectType] -= 1;
      assigned.push(item.level === levelCursor ? item : { ...item, level: levelCursor });
    }
  }

  return assigned;
}
