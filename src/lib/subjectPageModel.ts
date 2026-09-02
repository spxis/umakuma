import { WORD_EXAMPLE_LIMIT } from "@/app/shared/subject-page/SubjectPage.constants";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { subjectHref } from "@/lib/globalSearch";
import { parseJlptWordExamples } from "@/lib/jlptWordExamples";
import type { KanjiDictionaryEntry } from "@/lib/kanjiDictionary.types";
import { relatedGroupsFor, type RelatedGroup, type RelatedRow } from "@/lib/relatedSubjects";
import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";
import type { CatalogRelatedReference, CatalogSubjectDetail } from "@/lib/subjectCatalogDetails";

/**
 * A kanji page, assembled from whatever knows the character.
 *
 * The rule that decides everything here: the dictionary sources are the root
 * and WaniKani is the bonus. KANJIDIC answers for all 10,384 characters, the
 * JLPT table for the 2,211 the exams cover, and those two are what a page is
 * built out of. WaniKani teaches about 2,000 and sits on top - its radicals,
 * its look-alikes, its vocabulary and its mnemonics - additive where the
 * character happens to be taught and absent without apology where it is not.
 *
 * The test of the layering: a page must be complete without WaniKani and
 * better with it. Build compounds on WaniKani alone and four fifths of the
 * kanji pages stay as thin as they were.
 *
 * Pure, so the assembly can be tested against rows rather than a database.
 * The page reads the sources and hands them here; nothing below touches I/O.
 */

/** What the JLPT table adds beyond the dictionary: its level, Heisig, the compounds. */
export type JlptKanjiFacts = {
  nLevel: number;
  heisigKeyword: string | null;
  wordExamples: unknown;
};

export type KanjiPageSources = {
  character: string;
  grade: SchoolGradeKanjiEntry | null;
  dictionary: KanjiDictionaryEntry | null;
  jlpt: JlptKanjiFacts | null;
  wanikani: CatalogSubjectDetail | null;
};

/** One kanji inside a compound, linked to its own page. */
export type WordExampleKanji = {
  label: string;
  href: string;
  reading: string | null;
  meaning: string | null;
  level: number | null;
};

export type WordExample = {
  written: string;
  pronounced: string;
  gloss: string;
  kanji: WordExampleKanji[];
};

export type KanjiPageModel = {
  character: string;
  /** Facts the JLPT table holds that the dictionary does not. */
  jlptLevel: number | null;
  heisigKeyword: string | null;
  /** Compounds, from the JLPT table. The headline of the page. */
  words: WordExample[];
  /** WaniKani's relations, where it teaches the character. */
  related: RelatedGroup[];
  /** WaniKani's mnemonics, where it teaches the character. */
  mnemonics: { meaning: string; reading: string } | null;
  /** WaniKani's level, for the header pill. */
  wkLevel: number | null;
};

/**
 * The compounds a kanji appears in, ready to draw.
 *
 * Each kanji inside a word is linked to its own page rather than the word to
 * a vocabulary page: most JLPT example words are not WaniKani vocabulary, so
 * linking 凍結防止剤 to /vocabulary/… lands on "Nothing here by that name".
 * A kanji page always resolves.
 *
 * The page's own character is left out of the chips. It is the page being
 * read, and a link back to where you are is a chip that does nothing.
 */
export function toWordExamples(raw: unknown, character: string): WordExample[] {
  return parseJlptWordExamples(raw)
    .slice(0, WORD_EXAMPLE_LIMIT)
    .map((example) => ({
      written: example.written,
      pronounced: example.pronounced,
      gloss: example.gloss,
      kanji: (example.kanjiItems ?? []).flatMap((item) => {
        if (item.label === character) return [];
        const href = subjectHref({ subjectType: SUBJECT_TYPES.kanji, characters: item.label, slug: null });
        if (!href) return [];
        return [
          {
            label: item.label,
            href,
            reading: item.reading ?? null,
            meaning: item.meaning ?? null,
            level: typeof item.wkLevel === "number" ? item.wkLevel : null,
          },
        ];
      }),
    }));
}

/** A catalogue cross-reference as the grouping maths wants it. */
function toRelatedRow(reference: CatalogRelatedReference): RelatedRow {
  return {
    subjectId: reference.subjectId,
    subjectType: reference.subjectType,
    level: reference.wkLevel ?? 0,
    characters: reference.characters,
    slug: reference.slug,
    meaning: reference.meaning,
    reading: reference.reading,
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

/**
 * A subject's WaniKani relations, grouped, for any of the three pages.
 *
 * The same field means different things at each level - a kanji's
 * amalgamations are words, a radical's are kanji, a word's components are
 * kanji - and the catalogue has already sorted them into named lists. The
 * grouping owns the reading of those lists so no page can get it backwards
 * and put a kanji behind a /vocabulary address.
 */
export function relatedGroupsForSubject(
  detail: CatalogSubjectDetail,
  neighbours: CatalogRelatedReference[] = [],
): RelatedGroup[] {
  const components = detail.subjectType === SUBJECT_TYPES.vocabulary ? detail.componentKanji : detail.radicals;
  return relatedGroupsFor({
    subjectId: detail.subjectId,
    subjectType: detail.subjectType,
    components: components.map(toRelatedRow),
    amalgamations: detail.usedInVocabulary.map(toRelatedRow),
    visuallySimilar: detail.visuallySimilar.map(toRelatedRow),
    neighbours: neighbours.map(toRelatedRow),
  });
}

/**
 * A word's neighbourhood: the other words built from its kanji.
 *
 * Two sources could supply it. Each kanji's JLPT word examples cover more
 * characters, but an example is only a string - no level, and no page unless
 * the catalogue happens to hold it, so a chip made from one might lead
 * nowhere. Each kanji's WaniKani amalgamations are catalogue rows with a
 * level and an address, and every one of them has a page. The neighbourhood
 * is drawn from the amalgamations: a list of places to go beats a longer
 * list of names.
 *
 * The kanji details arrive already loaded; this only gathers their words,
 * once each. Dropping the word itself and its kanji is the grouping's job.
 */
export function neighbourReferences(kanji: CatalogSubjectDetail[]): CatalogRelatedReference[] {
  const seen = new Set<number>();
  const gathered: CatalogRelatedReference[] = [];
  for (const detail of kanji) {
    for (const word of detail.usedInVocabulary) {
      if (seen.has(word.subjectId)) continue;
      seen.add(word.subjectId);
      gathered.push(word);
    }
  }
  return gathered;
}

export function assembleKanjiPage(sources: KanjiPageSources): KanjiPageModel {
  const { character, jlpt, wanikani } = sources;
  const related = wanikani ? relatedGroupsForSubject(wanikani) : [];

  const meaningMnemonic = wanikani ? stripHtml(wanikani.meaningExplanation) : "";
  const readingMnemonic = wanikani ? stripHtml(wanikani.readingExplanation) : "";

  return {
    character,
    jlptLevel: jlpt?.nLevel ?? null,
    heisigKeyword: jlpt?.heisigKeyword?.trim() || null,
    words: jlpt ? toWordExamples(jlpt.wordExamples, character) : [],
    related,
    mnemonics:
      meaningMnemonic || readingMnemonic ? { meaning: meaningMnemonic, reading: readingMnemonic } : null,
    wkLevel: wanikani?.wkLevel ?? null,
  };
}
