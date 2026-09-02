import "server-only";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { prisma } from "@/lib/prisma";
import { getPublicSubject } from "@/lib/publicSubject";
import { getSchoolGradeKanjiByCharacter } from "@/lib/schoolGrades";
import { assembleKanjiPage, type JlptKanjiFacts, type KanjiPageModel } from "@/lib/subjectPageModel";
import { fetchSentencesForKanji, type ExampleSentence } from "@/lib/tatoebaSentences";

/**
 * Everything a kanji page reads, gathered once and handed to the assembler.
 *
 * Five sources, read together: the school catalogue and the dictionary are on
 * disk, the JLPT table and the WaniKani catalogue are in Neon, the sentences
 * are in Neon too. None depends on another, so none waits for another. The
 * assembly itself is `assembleKanjiPage`, which takes rows and is tested on
 * rows; this file is only the reading.
 */

/**
 * What the JLPT table adds, or null.
 *
 * Read straight by character rather than through the WaniKani catalogue,
 * which joins JLPT only for the kanji it teaches. The four fifths of the
 * dictionary WaniKani skips would otherwise never see their compounds.
 */
async function loadJlptFacts(character: string): Promise<JlptKanjiFacts | null> {
  const row = await prisma.jlptKanji.findUnique({
    where: { kanji: character },
    select: { nLevel: true, heisigKeyword: true, wordExamples: true },
  });
  return row ? { nLevel: row.nLevel, heisigKeyword: row.heisigKeyword, wordExamples: row.wordExamples } : null;
}

export type KanjiPage = KanjiPageModel & { sentences: ExampleSentence[] };

export async function loadKanjiPage(character: string): Promise<KanjiPage> {
  const [jlpt, wanikani, sentences] = await Promise.all([
    loadJlptFacts(character),
    getPublicSubject(SUBJECT_TYPES.kanji, character),
    fetchSentencesForKanji(character),
  ]);

  return {
    ...assembleKanjiPage({
      character,
      grade: getSchoolGradeKanjiByCharacter(character),
      dictionary: getKanjiDictionaryEntry(character),
      jlpt,
      wanikani,
    }),
    sentences,
  };
}
