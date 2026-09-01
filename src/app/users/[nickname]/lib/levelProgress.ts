import "server-only";

import { accountUrlKeyWhere } from "@/lib/accountLookup";
import {
  LEARNED_SRS_GROUPS,
  SUBJECT_TYPES,
  WK_STATUSES,
  isSubjectType,
  type SubjectType,
  type WkStatus,
} from "@/lib/domainConstants";
import { EMPTY_ITEM_SPREAD, isItemSpread } from "@/lib/itemSpread";
import type { JlptKanjiRow } from "@/lib/jlptTypes";
import { prisma } from "@/lib/prisma";
import { withReviewSuccessRates } from "@/lib/reviewSuccessRates";
import { getUserKanjiIndex } from "@/lib/wanikani";
import { wanikaniConnection } from "@/lib/wanikaniConnection";

import type {
  ItemSpreadGroupDetails,
  LevelProgressSnapshot,
  SrsGroupKey,
  TypeProgress,
} from "../UserDashboardTabs.types";

type LevelKanjiItem = {
  subjectId: number;
  characters: string;
  meanings: string[];
  wkLevel: number;
  srsStage: number;
  status: WkStatus;
  availableAt: string | null;
  subjectType?: SubjectType;
  successRate?: number;
};

type LevelSnapshotRow = {
  level: number;
  items: unknown;
};

/**
 * A member's level progress: what they have learned, where it sits, what is
 * left of the current level.
 *
 * This is the expensive half of a member page - every level snapshot on the
 * account, each carrying that level's subjects, plus the per-level and
 * per-type arithmetic over them. It used to run on every one of the six
 * addresses that shared one page, so Read fetched all of it to render a table
 * of yen. Now it is a function, and a page calls it only if it shows it.
 *
 * `withJlpt` is separate because the JLPT explorer additionally needs the whole
 * `JlptKanji` table and the member's kanji index from WaniKani, which the other
 * two explorers have no use for.
 */
export async function loadLevelProgress(userKey: string, options: { withJlpt?: boolean } = {}) {
  const shouldLoadJlptData = options.withJlpt === true;

  const account = await prisma.account.findFirstOrThrow({
    where: accountUrlKeyWhere(userKey),
    select: {
      id: true,
      tokenEncrypted: true,
      tokenIv: true,
      tokenTag: true,
      nickname: true,
      wkUsername: true,
      joinedByEmail: true,
      wkLevel: true,
      reviewCount: true,
      burnedCount: true,
      pendingReviews: true,
      radicalCount: true,
      vocabularyCount: true,
      apprenticeCount: true,
      guruCount: true,
      masterCount: true,
      enlightenedCount: true,
      levelKanjiTotal: true,
      levelKanjiLearned: true,
      levelKanjiGuruPlus: true,
      levelKanjiLocked: true,
      estimatedHoursRemaining: true,
      levelKanjiItems: true,
      itemSpread: true,
      lastActivityAt: true,
      lastSyncedAt: true,
    },
  });

  const wkLevel = account.wkLevel ?? 0;

  const levelKanjiItems = await withReviewSuccessRates(
    account.id,
    (account.levelKanjiItems ?? []) as LevelKanjiItem[],
  );
  const itemSpread = isItemSpread(account.itemSpread) ? account.itemSpread : EMPTY_ITEM_SPREAD;
  const userKanjiIndex = shouldLoadJlptData
    ? await withReviewSuccessRates(
        account.id,
        await getUserKanjiIndex(
          wanikaniConnection(account)?.token ?? "",
        ),
      )
    : [];
  const jlptKanjiRows = shouldLoadJlptData
    ? ((await prisma.jlptKanji.findMany({
        orderBy: [{ nLevel: "asc" }, { kanji: "asc" }],
        select: {
          kanji: true,
          nLevel: true,
          strokeCount: true,
          frequencyRank: true,
          schoolGrade: true,
          heisigKeyword: true,
          unicodeHex: true,
          sourceJlpt: true,
          primaryMeaning: true,
          meanings: true,
          onReadings: true,
          kunReadings: true,
          nanoriReadings: true,
          notes: true,
          wordExamples: true,
        },
      })) as JlptKanjiRow[])
    : [];

  const levelSnapshots = (await prisma.levelSnapshot.findMany({
    where: { accountId: account.id },
    orderBy: { level: "asc" },
    select: {
      level: true,
      items: true,
    },
  })) as LevelSnapshotRow[];

  const progressItemsByLevel = new Map<number, LevelKanjiItem[]>();

  for (const row of levelSnapshots) {
    const rawItems = Array.isArray(row.items) ? row.items : [];
    const items = rawItems.filter(
      (item): item is LevelKanjiItem =>
        typeof item === "object" &&
        item !== null &&
        isSubjectType((item as LevelKanjiItem).subjectType),
    );

    progressItemsByLevel.set(row.level, items);
  }

  if (!progressItemsByLevel.has(wkLevel)) {
    const fallbackItems = levelKanjiItems.filter(
      (item) => isSubjectType(item.subjectType),
    );
    progressItemsByLevel.set(wkLevel, fallbackItems);
  }

  function computeTypeProgress(itemsForLevel: LevelKanjiItem[], type: SubjectType): TypeProgress {
    const items = itemsForLevel.filter((item) => item.subjectType === type);
    const locked = items.filter((item) => item.srsStage <= 0).length;
    const apprentice = items.filter((item) => item.srsStage >= 1 && item.srsStage <= 4).length;
    const guru = items.filter((item) => item.srsStage === 5 || item.srsStage === 6).length;
    const master = items.filter((item) => item.srsStage === 7).length;
    const enlightened = items.filter((item) => item.srsStage === 8).length;
    const burned = items.filter((item) => item.srsStage >= 9).length;
    const guruOrHigher = guru + master + enlightened + burned;
    const total = items.length;

    return {
      guruOrHigher,
      total,
      percent: total === 0 ? 0 : Math.round((guruOrHigher / total) * 100),
      locked,
      apprentice,
      guru,
      master,
      enlightened,
      burned,
    };
  }

  function computeLevelSnapshot(level: number): LevelProgressSnapshot {
    const itemsForLevel = progressItemsByLevel.get(level) ?? [];
    const radical = computeTypeProgress(itemsForLevel, SUBJECT_TYPES.radical);
    const kanji = computeTypeProgress(itemsForLevel, SUBJECT_TYPES.kanji);
    const vocabulary = computeTypeProgress(itemsForLevel, SUBJECT_TYPES.vocabulary);
    const remainingToLevelUp = Math.max(0, Math.ceil(kanji.total * 0.9) - kanji.guruOrHigher);

    return {
      radical,
      kanji,
      vocabulary,
      remainingToLevelUp,
      passedLevelUpGate: kanji.guruOrHigher >= Math.ceil(kanji.total * 0.9),
    };
  }

  const higherStartedLevels = Array.from(progressItemsByLevel.entries())
    .filter(([level, items]) => level > wkLevel && items.some((item) => item.srsStage > 0))
    .map(([level]) => level)
    .sort((a, b) => a - b);

  const availableProgressLevels = [
    ...Array.from({ length: Math.max(1, wkLevel) }, (_, index) => index + 1),
    ...higherStartedLevels,
  ];

  const levelProgressByLevel = Object.fromEntries(
    availableProgressLevels.map((level) => [level, computeLevelSnapshot(level)]),
  ) as Record<number, LevelProgressSnapshot>;
  const levelItemCountsByLevel = Object.fromEntries(
    availableProgressLevels.map((level) => {
      const progress = levelProgressByLevel[level] ?? computeLevelSnapshot(level);
      return [level, progress.radical.total + progress.kanji.total + progress.vocabulary.total];
    }),
  ) as Record<number, number>;

  const createEmptyItemSpreadDetails = (): ItemSpreadGroupDetails => ({
    [WK_STATUSES.apprentice]: { levels: [], stages: [] },
    [WK_STATUSES.guru]: { levels: [], stages: [] },
    [WK_STATUSES.master]: { levels: [], stages: [] },
    [WK_STATUSES.enlightened]: { levels: [], stages: [] },
    [WK_STATUSES.burned]: { levels: [], stages: [] },
  });

  const itemSpreadDetails: ItemSpreadGroupDetails = createEmptyItemSpreadDetails();

  const groupByStage = (srsStage: number): { group: SrsGroupKey; label: string } | null => {
    if (srsStage >= 1 && srsStage <= 4) return { group: WK_STATUSES.apprentice, label: `SRS ${srsStage}` };
    if (srsStage === 5) return { group: WK_STATUSES.guru, label: "SRS 5" };
    if (srsStage === 6) return { group: WK_STATUSES.guru, label: "SRS 6" };
    if (srsStage === 7) return { group: WK_STATUSES.master, label: "SRS 7" };
    if (srsStage === 8) return { group: WK_STATUSES.enlightened, label: "SRS 8" };
    if (srsStage >= 9) return { group: WK_STATUSES.burned, label: "SRS 9+" };
    return null;
  };

  for (const [level, items] of Array.from(progressItemsByLevel.entries()).sort((a, b) => b[0] - a[0])) {
    const stageTotalsByGroup = Object.fromEntries(
      LEARNED_SRS_GROUPS.map((group) => [group, new Map<string, { radical: number; kanji: number; vocabulary: number; total: number }>()]),
    ) as Record<SrsGroupKey, Map<string, { radical: number; kanji: number; vocabulary: number; total: number }>>;
    const levelTotalsByGroup = Object.fromEntries(
      LEARNED_SRS_GROUPS.map((group) => [group, { radical: 0, kanji: 0, vocabulary: 0, total: 0 }]),
    ) as Record<SrsGroupKey, { radical: number; kanji: number; vocabulary: number; total: number }>;

    for (const item of items) {
      const bucket = groupByStage(item.srsStage);
      if (!bucket) {
        continue;
      }

      const subjectType = item.subjectType;
      if (!isSubjectType(subjectType)) {
        continue;
      }

      const groupTotals = levelTotalsByGroup[bucket.group];
      groupTotals[subjectType] += 1;
      groupTotals.total += 1;

      const stageMap = stageTotalsByGroup[bucket.group];
      const stageTotals = stageMap.get(bucket.label) ?? { radical: 0, kanji: 0, vocabulary: 0, total: 0 };
      stageTotals[subjectType] += 1;
      stageTotals.total += 1;
      stageMap.set(bucket.label, stageTotals);
    }

    (Object.keys(levelTotalsByGroup) as SrsGroupKey[]).forEach((groupKey) => {
      const totals = levelTotalsByGroup[groupKey];
      if (totals.total <= 0) {
        return;
      }

      itemSpreadDetails[groupKey].levels.push({
        level,
        radical: totals.radical,
        kanji: totals.kanji,
        vocabulary: totals.vocabulary,
        total: totals.total,
      });

      const stageRows = Array.from(stageTotalsByGroup[groupKey].entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, counts]) => ({
          label,
          radical: counts.radical,
          kanji: counts.kanji,
          vocabulary: counts.vocabulary,
          total: counts.total,
        }));

      for (const row of stageRows) {
        const existing = itemSpreadDetails[groupKey].stages.find((stage) => stage.label === row.label);
        if (existing) {
          existing.radical += row.radical;
          existing.kanji += row.kanji;
          existing.vocabulary += row.vocabulary;
          existing.total += row.total;
        } else {
          itemSpreadDetails[groupKey].stages.push(row);
        }
      }
    });
  }

  (Object.keys(itemSpreadDetails) as SrsGroupKey[]).forEach((groupKey) => {
    itemSpreadDetails[groupKey].stages.sort((a, b) => a.label.localeCompare(b.label));
  });

  const currentLevelProgress = levelProgressByLevel[wkLevel] ?? computeLevelSnapshot(wkLevel);
  const levelRadicalProgress = currentLevelProgress.radical;
  const levelKanjiProgress = currentLevelProgress.kanji;
  const levelVocabularyProgress = currentLevelProgress.vocabulary;
  const totalLearnedKanji =
    itemSpread.guru.kanji +
    itemSpread.master.kanji +
    itemSpread.enlightened.kanji +
    itemSpread.burned.kanji;

  const remainingToLevelUp = currentLevelProgress.remainingToLevelUp;
  const passedLevelUpGate = currentLevelProgress.passedLevelUpGate;


  return {
    account,
    levelKanjiItems,
    itemSpread,
    itemSpreadDetails,
    userKanjiIndex,
    jlptKanjiRows,
    levelProgressByLevel,
    levelItemCountsByLevel,
    availableProgressLevels,
    currentLevelProgress,
    levelRadicalProgress,
    levelKanjiProgress,
    levelVocabularyProgress,
    totalLearnedKanji,
    remainingToLevelUp,
    passedLevelUpGate,
  };
}
