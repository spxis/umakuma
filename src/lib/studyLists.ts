import "server-only";

import { randomBytes } from "node:crypto";

import { LIST_ITEM_KINDS, LIST_VISIBILITIES, SUBJECT_TYPES } from "./domainConstants";
import { prisma } from "./prisma";
import {
  isMissingStudyListTableError,
  listSlug,
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

const LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  contributions: true,
  createdAt: true,
  updatedAt: true,
  copyCount: true,
  shareCount: true,
  items: { select: ITEM_SELECT, orderBy: { position: "asc" as const } },
} as const;

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: StudyListSummary["visibility"];
  contributions: StudyListSummary["contributions"];
  createdAt: Date;
  updatedAt: Date;
  copyCount: number;
  shareCount: number;
  items: StudyListItemRef[];
};

function toSummary(row: ListRow): StudyListSummary {
  return {
    id: row.id,
    name: row.name,
    slug: listSlug(row.name),
    description: row.description,
    visibility: row.visibility,
    contributions: row.contributions,
    items: row.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    copyCount: row.copyCount,
    shareCount: row.shareCount,
  };
}

export async function fetchStudyLists(accountId: string): Promise<StudyListSummary[]> {
  try {
    const rows = await prisma.studyList.findMany({
      where: { accountId },
      select: LIST_SELECT,
      orderBy: { updatedAt: "desc" },
      take: STUDY_LIST_LIMITS.perAccount,
    });
    return rows.map(toSummary);
  } catch (error) {
    if (isMissingStudyListTableError(error)) return [];
    throw error;
  }
}

/**
 * The list at an address, with what a page needs to decide who may open it.
 *
 * The slug is derived from the name, never stored, so this reads the member's
 * names and compares slugs - a hundred names at most, which is cheaper than a
 * column that has to be kept in step with every rename.
 */
export async function findListBySlug(
  accountId: string,
  slug: string,
): Promise<(StudyListSummary & { shareToken: string | null }) | null> {
  const wanted = slug.toLowerCase();
  const rows = await prisma.studyList.findMany({
    where: { accountId },
    select: { ...LIST_SELECT, shareToken: true },
    take: STUDY_LIST_LIMITS.perAccount,
  });
  const row = rows.find((candidate) => listSlug(candidate.name) === wanted);
  return row ? { ...toSummary(row), shareToken: row.shareToken } : null;
}

/** Whether another of the member's lists already answers to this name's address. */
export async function slugTaken(accountId: string, name: string, exceptListId?: string): Promise<boolean> {
  const slug = listSlug(name);
  const rows = await prisma.studyList.findMany({
    where: { accountId, ...(exceptListId ? { id: { not: exceptListId } } : {}) },
    select: { name: true },
    take: STUDY_LIST_LIMITS.perAccount,
  });
  return rows.some((row) => listSlug(row.name) === slug);
}

/**
 * The key an unlisted link carries, made once and kept.
 *
 * Long enough that nobody guesses it, short enough to paste: twelve bytes as
 * base64url is sixteen characters. Once made it stays through every change of
 * visibility, so a link sent while the list was unlisted works again when it
 * is unlisted again.
 */
export async function ensureShareToken(listId: string): Promise<string> {
  const current = await prisma.studyList.findUnique({ where: { id: listId }, select: { shareToken: true } });
  if (current?.shareToken) return current.shareToken;
  const token = randomBytes(12).toString("base64url");
  await prisma.studyList.update({ where: { id: listId }, data: { shareToken: token } });
  return token;
}

/** The share link was copied: count it, for the list's own facts. */
export async function countShare(listId: string): Promise<void> {
  await prisma.studyList.update({ where: { id: listId }, data: { shareCount: { increment: 1 } } });
}

export { LIST_VISIBILITIES };

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
        ...(characters.length > 0
          ? [{ characters: { in: characters }, subjectType: { in: [SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary] } }]
          : []),
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
