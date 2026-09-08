import "server-only";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { JlptMeta } from "@/lib/jlptTypes";
import { studyConfusableWarnings, type ConfusableWarning } from "@/lib/kanjiConfusableWarning";
import type { LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { prisma } from "@/lib/prisma";
import { toJlptMeta } from "@/lib/subjectCatalogDetails";

/**
 * What a library kanji is, beyond what the member typed in.
 *
 * A library item is a character and the member's own words for it; the
 * WaniKani feed also hands the modal the N band, the dictionary panel and
 * the look-alike warning, all of which are facts about the character rather
 * than about the library. So they are looked up by character, once per page,
 * and put on - the library feed then reads the same as the other two.
 */
export type CustomStudyFacts = {
  jlpt: ReadonlyMap<string, { nLevel: number | null; meta: JlptMeta }>;
  warnFor: (characters: string) => ConfusableWarning[];
};

export async function loadCustomStudyFacts(
  items: readonly { subjectType: string; characters: string }[],
  account: { wkLevel: number | null; ladderStream: LadderStreamValue | null },
): Promise<CustomStudyFacts> {
  const kanji = Array.from(new Set(items.filter((item) => item.subjectType === SUBJECT_TYPES.kanji && item.characters).map((item) => item.characters)));
  const rows =
    kanji.length > 0
      ? await prisma.jlptKanji
          .findMany({
            where: { kanji: { in: kanji } },
            select: {
              kanji: true, nLevel: true, primaryMeaning: true, meanings: true, onReadings: true, kunReadings: true,
              nanoriReadings: true, wordExamples: true, strokeCount: true, frequencyRank: true, schoolGrade: true, heisigKeyword: true,
            },
          })
          .catch(() => [])
      : [];
  return {
    jlpt: new Map(rows.map((row) => [row.kanji, { nLevel: row.nLevel, meta: toJlptMeta(row) }])),
    warnFor: (characters) => studyConfusableWarnings(characters, account),
  };
}

type Facts = { jlptLevel: number | null; jlptMeta: JlptMeta | null; confusables: ConfusableWarning[] };

/** The facts on the items; a word or a radical takes none. */
export function withCustomStudyFacts<T extends { subjectType: string; characters: string }>(
  items: readonly T[],
  facts: CustomStudyFacts,
): (T & Facts)[] {
  return items.map((item) => {
    if (item.subjectType !== SUBJECT_TYPES.kanji) return { ...item, jlptLevel: null, jlptMeta: null, confusables: [] };
    const jlpt = facts.jlpt.get(item.characters);
    return { ...item, jlptLevel: jlpt?.nLevel ?? null, jlptMeta: jlpt?.meta ?? null, confusables: facts.warnFor(item.characters) };
  });
}
