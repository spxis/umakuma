import "server-only";

import { STUDY_TAG_VALUES, type StudyTag } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

export type StudyTagRow = {
  subjectId: number;
  favorite: boolean;
  trouble: boolean;
  burned: boolean;
};

export function isMissingStudyTagTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; meta?: { table?: string } };
  if (candidate.code !== "P2021") {
    return false;
  }

  const table = candidate.meta?.table ?? "";
  if (table.includes("StudySubjectTag")) {
    return true;
  }

  return (candidate.message ?? "").includes("StudySubjectTag");
}

/** Every item this account has tagged either way. Empty until the table exists. */
export async function fetchStudyTagRows(accountId: string): Promise<StudyTagRow[]> {
  try {
    return await prisma.studySubjectTag.findMany({
      where: {
        accountId,
        OR: [{ favorite: true }, { trouble: true }, { burned: true }],
      },
      select: {
        subjectId: true,
        favorite: true,
        trouble: true,
        burned: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    if (isMissingStudyTagTableError(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * Trouble and Favourites, described the way a saved list is described.
 *
 * These two are lists in every sense that matters to a member - they are named,
 * they hold subjects, they are what you practise from - but they are tag rows
 * rather than `StudyList` rows, so the lists page did not know about them and
 * they could only be reached through a modal that opens from a button. Somebody
 * looking at their lists could not see the two lists they had actually built.
 *
 * Returned in the same shape a saved list uses, so the page renders both kinds
 * through one card rather than growing a second set of markup. Both are always
 * returned, empty ones included: "you have no favourites yet" is the answer to
 * the question, and a missing card is not.
 */
export type TaggedListSummary = {
  tag: StudyTag;
  count: number;
  /** Enough to recognise the list, in the same order the panel shows them. */
  characters: string[];
};

/** How many characters a card previews before it is just a wall. */
const TAGGED_PREVIEW_LIMIT = 24;

export async function fetchTaggedListSummaries(accountId: string): Promise<TaggedListSummary[]> {
  const rows = await fetchStudyTagRows(accountId);
  const details = await getCatalogSubjectDetails(rows.map((row) => row.subjectId));

  return STUDY_TAG_VALUES.map((tag) => {
    const tagged = rows.filter((row) => row[tag]);
    const characters = tagged
      .map((row) => details.get(row.subjectId)?.characters)
      .filter((value): value is string => Boolean(value));

    return { tag, count: tagged.length, characters: characters.slice(0, TAGGED_PREVIEW_LIMIT) };
  });
}
