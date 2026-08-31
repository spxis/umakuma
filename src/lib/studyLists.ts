import "server-only";

import { prisma } from "./prisma";

/**
 * Named sets of characters a member built by hand.
 *
 * The same idea as the Trouble and Favourites lists - a member-curated set of
 * subjects - with a name instead of a flag, so there can be as many as the week
 * needs rather than exactly two.
 */

export const STUDY_LIST_LIMITS = {
  /** Enough for "Week 37 - the ones he keeps missing" and not enough to hide a paragraph. */
  nameLength: 60,
  /** The same cap the selection carries, since a list is a saved selection. */
  characters: 200,
  /** Per member, so a runaway client cannot fill the table. */
  perAccount: 100,
} as const;

export type StudyListSummary = {
  id: string;
  name: string;
  characters: string[];
  updatedAt: string;
};

/**
 * A missing table is survivable.
 *
 * This repo applies schema by hand, so code can reach production a moment
 * before the table does. Everywhere a list is only decoration - a count, a
 * menu of saved sheets - an empty answer is far better than a 500 that takes
 * the whole page down with it.
 */
export function isMissingStudyListTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "P2021" || code === "P2022";
}

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

/** Trimmed, deduplicated and capped - the shape the database should hold. */
export function normalizeListCharacters(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    for (const character of Array.from(value)) {
      if (seen.size >= STUDY_LIST_LIMITS.characters) break;
      if (character.trim()) seen.add(character);
    }
  }
  return [...seen];
}
