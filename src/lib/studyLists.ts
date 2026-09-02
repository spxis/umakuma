import "server-only";

import { LIST_ITEM_KINDS, SUBJECT_TYPES } from "./domainConstants";
import { prisma } from "./prisma";
import {
  isMissingStudyListTableError,
  STUDY_LIST_LIMITS,
  type StudyListItemRef,
  type StudyListSummary,
} from "./studyListRules";

/**
 * Named sets of items a member built by hand.
 *
 * The same idea as the Trouble and Favourites lists - a member-curated set of
 * subjects - with a name instead of a flag, so there can be as many as the week
 * needs rather than exactly two. Each item carries its kind, so a list of
 * words is a list of words and a list of kanji can be told from it.
 *
 * The rules about what a list may be called and hold live in `studyListRules`,
 * which the browser can import; this file is the reading and writing of them.
 */

const ITEM_SELECT = { kind: true, key: true, subjectId: true } as const;

export async function fetchStudyLists(accountId: string): Promise<StudyListSummary[]> {
  try {
    const rows = await prisma.studyList.findMany({
      where: { accountId },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        items: { select: ITEM_SELECT, orderBy: { position: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      take: STUDY_LIST_LIMITS.perAccount,
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      items: row.items,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    if (isMissingStudyListTableError(error)) return [];
    throw error;
  }
}

/**
 * The subject ids the catalogue has for these items, filled in where absent.
 *
 * A kanji or a word is named by its characters and a radical by its slug;
 * WaniKani's id is looked up once here so the list can carry it, and a kanji
 * WaniKani does not teach stays without one, as it should.
 */
export async function attachSubjectIds(items: StudyListItemRef[]): Promise<StudyListItemRef[]> {
  const wanted = items.filter((item) => item.subjectId == null && item.kind !== LIST_ITEM_KINDS.sentence);
  if (wanted.length === 0) return items;

  const characters = wanted.filter((item) => item.kind !== LIST_ITEM_KINDS.radical).map((item) => item.key);
  const slugs = wanted.filter((item) => item.kind === LIST_ITEM_KINDS.radical).map((item) => item.key);
  const rows = await prisma.wkSubjectCatalog.findMany({
    where: {
      hiddenAt: null,
      OR: [
        ...(characters.length > 0 ? [{ characters: { in: characters }, subjectType: { in: [SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary] } }] : []),
        ...(slugs.length > 0 ? [{ slug: { in: slugs }, subjectType: SUBJECT_TYPES.radical }] : []),
      ],
    },
    select: { wkSubjectId: true, subjectType: true, characters: true, slug: true },
    orderBy: { level: "asc" },
  });

  const byKindAndKey = new Map<string, number>();
  for (const row of rows) {
    const key = row.subjectType === SUBJECT_TYPES.radical ? row.slug : row.characters;
    if (!key) continue;
    const id = `${row.subjectType}:${key}`;
    if (!byKindAndKey.has(id)) byKindAndKey.set(id, row.wkSubjectId);
  }

  return items.map((item) =>
    item.subjectId == null ? { ...item, subjectId: byKindAndKey.get(`${item.kind}:${item.key}`) ?? null } : item,
  );
}

/** Replace what a list holds, in this order, in one statement. */
export async function replaceListItems(
  listId: string,
  items: StudyListItemRef[],
  addedByAccountId: string,
): Promise<StudyListItemRef[]> {
  const resolved = await attachSubjectIds(items);
  await prisma.$transaction([
    prisma.studyListItem.deleteMany({ where: { listId } }),
    prisma.studyListItem.createMany({
      data: resolved.map((item, position) => ({
        listId,
        kind: item.kind,
        key: item.key,
        subjectId: item.subjectId ?? null,
        position,
        addedByAccountId,
      })),
    }),
    prisma.studyList.update({ where: { id: listId }, data: { updatedAt: new Date() } }),
  ]);
  return resolved;
}
