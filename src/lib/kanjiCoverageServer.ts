import "server-only";

import {
  buildKanjiCoverage,
  type KanjiCoverageEntry,
} from "@/lib/kanjiCoverage";
import { prisma } from "@/lib/prisma";

const WANIKANI_KANJI_TYPE = "kanji";

/**
 * Reads both catalogues and joins them on the character.
 *
 * Hidden WaniKani subjects are excluded: a subject WaniKani has retired is not
 * one it teaches, and counting it would hide a real gap.
 */
export async function loadKanjiCoverage(): Promise<KanjiCoverageEntry[]> {
  const [jlptRows, wanikaniRows] = await Promise.all([
    prisma.jlptKanji.findMany({
      select: {
        kanji: true,
        nLevel: true,
        schoolGrade: true,
        frequencyRank: true,
        primaryMeaning: true,
      },
    }),
    prisma.wkSubjectCatalog.findMany({
      where: { subjectType: WANIKANI_KANJI_TYPE, hiddenAt: null },
      select: { characters: true, wkSubjectId: true, level: true },
    }),
  ]);

  return buildKanjiCoverage(jlptRows, wanikaniRows);
}
