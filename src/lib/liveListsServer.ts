import "server-only";

import { LIST_ITEM_KINDS, SUBJECT_TYPES } from "./domainConstants";
import { LIVE_LIST_SOURCES, type LiveList } from "./liveLists";
import { prisma } from "./prisma";
import { querySchoolGradeCatalog } from "./schoolGrades";
import type { StudyListItemRef } from "./studyListRules";

/**
 * A live list's items, found rather than stored.
 *
 * Each source answers in its own order: the JLPT and the grades commonest
 * first, which is the order a learner meets them, and a WaniKani level in
 * the order WaniKani teaches it - radicals, then kanji, then the words that
 * use them. A kanji WaniKani has never taught keeps no subject id and is
 * still an item, exactly as in a saved list.
 */
const GRADE_PAGE_SIZE = 500;

export async function fetchLiveListItems(list: LiveList): Promise<StudyListItemRef[]> {
  if (list.source === LIVE_LIST_SOURCES.jlpt) {
    const rows = await prisma.jlptKanji.findMany({
      where: { nLevel: list.level },
      select: { kanji: true, frequencyRank: true },
      orderBy: [{ frequencyRank: { sort: "asc", nulls: "last" } }, { kanji: "asc" }],
    });
    return rows.map((row) => ({ kind: LIST_ITEM_KINDS.kanji, key: row.kanji, subjectId: null }));
  }

  if (list.source === LIVE_LIST_SOURCES.grade) {
    const catalog = querySchoolGradeCatalog({
      page: 1,
      pageSize: GRADE_PAGE_SIZE,
      grade: list.level,
      search: null,
      sortBy: "frequency",
      sortDir: "asc",
    });
    return catalog.items.map((entry) => ({ kind: LIST_ITEM_KINDS.kanji, key: entry.kanji, subjectId: null }));
  }

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { level: list.level, hiddenAt: null },
    select: { wkSubjectId: true, subjectType: true, characters: true, slug: true },
    orderBy: { wkSubjectId: "asc" },
  });
  const order: Record<string, number> = { [SUBJECT_TYPES.radical]: 0, [SUBJECT_TYPES.kanji]: 1, [SUBJECT_TYPES.vocabulary]: 2 };
  return rows
    .slice()
    .sort((left, right) => (order[left.subjectType] ?? 3) - (order[right.subjectType] ?? 3) || left.wkSubjectId - right.wkSubjectId)
    .flatMap((row) => {
      const key = row.subjectType === SUBJECT_TYPES.radical ? row.slug : row.characters;
      if (!key) return [];
      const kind =
        row.subjectType === SUBJECT_TYPES.radical
          ? LIST_ITEM_KINDS.radical
          : row.subjectType === SUBJECT_TYPES.vocabulary
            ? LIST_ITEM_KINDS.vocabulary
            : LIST_ITEM_KINDS.kanji;
      return [{ kind, key, subjectId: row.wkSubjectId }];
    });
}

/** Whether this member already follows a live list, and how many follow it. */
export async function liveSubscription(liveKey: string, accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  const row = await prisma.studyListSubscription.findUnique({
    where: { accountId_liveKey: { accountId, liveKey } },
    select: { id: true },
  });
  return row !== null;
}
