import { SUBJECT_TYPES, type SubjectType, type WkStatus } from "@/lib/domainConstants";

/**
 * The counts every study source hands the explorer beside its items.
 *
 * One implementation for the three feeds. The custom-library route grew its
 * own reducers and the UmaKuma feed would have been a third copy; the shape
 * the client reads is one shape, so it is built in one place.
 */
export type QueueSummaryItem = {
  subjectType?: SubjectType;
  wkLevel?: number | null;
  ukLevel?: number | null;
  srsStage: number;
  status: WkStatus;
};

export type TypeCounts = { all: number } & Record<SubjectType, number>;

export function createEmptyTypeCounts(): TypeCounts {
  return { all: 0, [SUBJECT_TYPES.radical]: 0, [SUBJECT_TYPES.kanji]: 0, [SUBJECT_TYPES.vocabulary]: 0 };
}

export const EMPTY_SRS_COUNTS = { all: 0, locked: 0, apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 } as const;
export type SrsCounts = { -readonly [K in keyof typeof EMPTY_SRS_COUNTS]: number };

/** The level the explorer files an item under: ours where the feed is ours. */
export function queueItemLevel(item: Pick<QueueSummaryItem, "wkLevel" | "ukLevel">): number | null {
  const level = item.ukLevel ?? item.wkLevel ?? null;
  return typeof level === "number" && level > 0 ? level : null;
}

export function summariseStudyQueue(items: QueueSummaryItem[]) {
  const typeCounts = createEmptyTypeCounts();
  const levelCounts: Record<number, number> = {};
  const typeCountsByLevel: Record<number, TypeCounts> = {};
  const srsCounts: SrsCounts = { ...EMPTY_SRS_COUNTS };
  const srsStageCounts: Record<number, number> = {};
  for (const item of items) {
    typeCounts.all += 1;
    if (item.subjectType) typeCounts[item.subjectType] += 1;
    srsCounts.all += 1;
    srsCounts[item.status] += 1;
    srsStageCounts[item.srsStage] = (srsStageCounts[item.srsStage] ?? 0) + 1;
    const level = queueItemLevel(item);
    if (level === null) continue;
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;
    const row = typeCountsByLevel[level] ?? createEmptyTypeCounts();
    row.all += 1;
    if (item.subjectType) row[item.subjectType] += 1;
    typeCountsByLevel[level] = row;
  }
  return { typeCounts, levelCounts, typeCountsByLevel, srsCounts, srsStageCounts };
}

export const SRS_TRANSITIONS = { promoted: "promoted", demoted: "demoted", unchanged: "unchanged", unknown: "unknown" } as const;
export type SrsTransition = (typeof SRS_TRANSITIONS)[keyof typeof SRS_TRANSITIONS];
const GROUPING_ORDER = ["locked", "apprentice", "guru", "master", "enlightened", "burned"];

/** Which way an answer moved the item, in the words the review modal reads. */
export function srsTransition(previousGrouping: string | null, newGrouping: string | null): SrsTransition {
  if (!previousGrouping || !newGrouping) return SRS_TRANSITIONS.unknown;
  if (previousGrouping === newGrouping) return SRS_TRANSITIONS.unchanged;
  const before = GROUPING_ORDER.indexOf(previousGrouping);
  const after = GROUPING_ORDER.indexOf(newGrouping);
  if (before < 0 || after < 0) return SRS_TRANSITIONS.unknown;
  return after > before ? SRS_TRANSITIONS.promoted : SRS_TRANSITIONS.demoted;
}
