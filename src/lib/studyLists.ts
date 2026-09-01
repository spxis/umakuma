import "server-only";

import { prisma } from "./prisma";
import {
  isMissingStudyListTableError,
  STUDY_LIST_LIMITS,
  type StudyListSummary,
} from "./studyListRules";

/**
 * Named sets of characters a member built by hand.
 *
 * The same idea as the Trouble and Favourites lists - a member-curated set of
 * subjects - with a name instead of a flag, so there can be as many as the week
 * needs rather than exactly two.
 *
 * The rules about what a list may be called and hold live in `studyListRules`,
 * which the browser can import; this file is only the reading of them.
 */

export async function fetchStudyLists(accountId: string): Promise<StudyListSummary[]> {
  try {
    const rows = await prisma.studyList.findMany({
      where: { accountId },
      select: { id: true, name: true, characters: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: STUDY_LIST_LIMITS.perAccount,
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      characters: row.characters,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    if (isMissingStudyListTableError(error)) return [];
    throw error;
  }
}
