import { prisma } from "@/lib/prisma";
import { SUBJECT_TYPES } from "@/lib/domainConstants";

import { fetchAllCollectionPages } from "./http";
import type { LeaderboardStats, WaniKaniAssignmentData } from "./types";

type JlptProgressResult = {
  learnedKanjiCount: number;
  jlptCounts: LeaderboardStats["jlptCounts"];
};

/**
 * What the catalogue answered, and what is left to ask the API for.
 *
 * Kept apart from the queries so the rule can be checked without a database:
 * every id the catalogue holds is answered from it, and only the ones it has
 * never seen are asked for. A catalogue row with no characters - a radical
 * WaniKani draws rather than writes - is still an answer, not a gap, so it
 * does not send us back to the API for a character that does not exist.
 */
export function charactersFromCatalog(
  subjectIds: readonly number[],
  rows: readonly { wkSubjectId: number; characters: string | null }[],
): { characters: Set<string>; missing: number[] } {
  const characters = new Set<string>();
  const known = new Set<number>();
  for (const row of rows) {
    known.add(row.wkSubjectId);
    if (row.characters) characters.add(row.characters);
  }

  return { characters, missing: subjectIds.filter((subjectId) => !known.has(subjectId)) };
}

/**
 * The characters behind a member's learned kanji.
 *
 * A character is a fact about a subject, not about the member, so it comes
 * from the local catalogue: this asked WaniKani for it in 200-id chunks, which
 * for fifteen hundred learned kanji is eight sequential round trips to read a
 * single static field, on every stats computation.
 *
 * The API stays as the fallback for ids the catalogue has not seen - a subject
 * added since the last sync is rare but real, and dropping it would quietly
 * undercount somebody's JLPT progress rather than fail.
 */
async function learnedCharacters(token: string, subjectIds: number[]): Promise<Set<string>> {
  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { wkSubjectId: { in: subjectIds }, subjectType: SUBJECT_TYPES.kanji },
    select: { wkSubjectId: true, characters: true },
  });

  const { characters, missing } = charactersFromCatalog(subjectIds, rows);
  const chunkSize = 200;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize).join(",");
    if (!chunk) continue;

    const subjectChunk = await fetchAllCollectionPages(`/subjects?ids=${chunk}`, token);
    for (const row of subjectChunk.data) {
      if ((row.object ?? "") !== SUBJECT_TYPES.kanji) continue;
      const data = row.data as { characters?: string | null };
      if (data.characters) characters.add(data.characters);
    }
  }

  return characters;
}

export async function computeJlptKanjiProgress(
  token: string,
  allAssignmentData: WaniKaniAssignmentData[],
): Promise<JlptProgressResult> {
  const learnedKanjiSubjectIds = Array.from(
    new Set(
      allAssignmentData
        .filter(
          (assignment) =>
            assignment.subject_type === SUBJECT_TYPES.kanji && assignment.unlocked_at && assignment.srs_stage >= 5,
        )
        .map((assignment) => assignment.subject_id),
    ),
  );

  const learnedKanjiCount = learnedKanjiSubjectIds.length;
  const jlptLearnedCounts = { n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 };

  if (learnedKanjiSubjectIds.length > 0) {
    const learnedKanjiChars = await learnedCharacters(token, learnedKanjiSubjectIds);

    if (learnedKanjiChars.size > 0) {
      const jlptRows = await prisma.jlptKanji.findMany({
        where: { kanji: { in: Array.from(learnedKanjiChars) } },
        select: { nLevel: true },
      });

      for (const row of jlptRows) {
        if (row.nLevel === 1) jlptLearnedCounts.n1 += 1;
        if (row.nLevel === 2) jlptLearnedCounts.n2 += 1;
        if (row.nLevel === 3) jlptLearnedCounts.n3 += 1;
        if (row.nLevel === 4) jlptLearnedCounts.n4 += 1;
        if (row.nLevel === 5) jlptLearnedCounts.n5 += 1;
      }
    }
  }

  const jlptTotalsRows = await prisma.jlptKanji.groupBy({
    by: ["nLevel"],
    _count: { _all: true },
  });

  const jlptTotals = { n1: 0, n2: 0, n3: 0, n4: 0, n5: 0 };
  for (const row of jlptTotalsRows) {
    if (row.nLevel === 1) jlptTotals.n1 = row._count._all;
    if (row.nLevel === 2) jlptTotals.n2 = row._count._all;
    if (row.nLevel === 3) jlptTotals.n3 = row._count._all;
    if (row.nLevel === 4) jlptTotals.n4 = row._count._all;
    if (row.nLevel === 5) jlptTotals.n5 = row._count._all;
  }

  const jlptCounts: LeaderboardStats["jlptCounts"] = {
    n1: {
      learned: jlptLearnedCounts.n1,
      total: jlptTotals.n1,
      percent: jlptTotals.n1 > 0 ? Math.round((jlptLearnedCounts.n1 / jlptTotals.n1) * 100) : 0,
    },
    n2: {
      learned: jlptLearnedCounts.n2,
      total: jlptTotals.n2,
      percent: jlptTotals.n2 > 0 ? Math.round((jlptLearnedCounts.n2 / jlptTotals.n2) * 100) : 0,
    },
    n3: {
      learned: jlptLearnedCounts.n3,
      total: jlptTotals.n3,
      percent: jlptTotals.n3 > 0 ? Math.round((jlptLearnedCounts.n3 / jlptTotals.n3) * 100) : 0,
    },
    n4: {
      learned: jlptLearnedCounts.n4,
      total: jlptTotals.n4,
      percent: jlptTotals.n4 > 0 ? Math.round((jlptLearnedCounts.n4 / jlptTotals.n4) * 100) : 0,
    },
    n5: {
      learned: jlptLearnedCounts.n5,
      total: jlptTotals.n5,
      percent: jlptTotals.n5 > 0 ? Math.round((jlptLearnedCounts.n5 / jlptTotals.n5) * 100) : 0,
    },
  };

  return { learnedKanjiCount, jlptCounts };
}
