import "server-only";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { prisma } from "@/lib/prisma";
import { getPublicSubject } from "@/lib/publicSubject";
import type { LadderStreamValue } from "@/lib/ladder/ladderStreams";
import { mergeWordExamples, wordsContaining } from "@/lib/kanjiWordSearch";
import { getSchoolGradeKanjiByCharacter } from "@/lib/schoolGrades";
import { parseJlptWordExamples } from "@/lib/jlptWordExamples";
import { WORD_EXAMPLE_LIMIT } from "@/app/shared/subject-page/SubjectPage.constants";
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
async function loadJlptFacts(
  character: string,
): Promise<{ facts: JlptKanjiFacts | null; wordExamples: unknown }> {
  const row = await prisma.jlptKanji.findUnique({
    where: { kanji: character },
    select: { nLevel: true, heisigKeyword: true, wordExamples: true },
  });
  return {
    facts: row ? { nLevel: row.nLevel, heisigKeyword: row.heisigKeyword } : null,
    wordExamples: row?.wordExamples ?? null,
  };
}

export type KanjiPage = KanjiPageModel & { sentences: ExampleSentence[] };

export async function loadKanjiPage(
  character: string,
  stream: LadderStreamValue | null,
): Promise<KanjiPage> {
  const [jlpt, wanikani, sentences] = await Promise.all([
    loadJlptFacts(character),
    getPublicSubject(SUBJECT_TYPES.kanji, character),
    fetchSentencesForKanji(character),
  ]);

  /*
   * The words this character is in, from both directions.
   *
   * Its own row first - those are the examples the exam table chose for it -
   * and then the words other rows spell with it, which is the only source a
   * character outside the table has. 七竃 is a word 七 is used in and a word
   * 竃 is used in; it was stored under 七 alone, so 竃's page had nothing.
   *
   * Asked for only when the row leaves room, because the reverse lookup is a
   * scan: a page with its full twelve is already showing what it would find.
   */
  const own = parseJlptWordExamples(jlpt.wordExamples);
  const room = WORD_EXAMPLE_LIMIT - own.length;
  /* Asked for more than the room, since some of what comes back is already
     on the page: 七竃 is stored under 七 and found again under 嶺. */
  const reverse = room > 0 ? await wordsContaining(character, WORD_EXAMPLE_LIMIT) : [];
  const words = mergeWordExamples(own, reverse, WORD_EXAMPLE_LIMIT);

  return {
    ...assembleKanjiPage({
      character,
      stream,
      grade: getSchoolGradeKanjiByCharacter(character),
      dictionary: getKanjiDictionaryEntry(character),
      jlpt: jlpt.facts,
      words,
      wanikani,
    }),
    sentences,
  };
}
