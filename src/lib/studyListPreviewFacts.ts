import "server-only";

import { LIST_ITEM_KINDS } from "@/lib/domainConstants";
import { getKanjiDictionaryEntry, primaryKanjiReading } from "@/lib/kanjiDictionary";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";
import type { StudyListItemRef } from "@/lib/studyListRules";

/** What a pill prints beside a glyph. Null where nothing is known. */
export type PreviewFact = { reading: string | null; meaning: string | null };

/** By item key: a character for a kanji, the word for a word. */
export type PreviewFacts = Record<string, PreviewFact>;

/**
 * How the items a list previews read and what they mean, for the pills.
 *
 * A card drew its items as a run of plain glyphs - no meaning, no reading,
 * the one place on a kanji site where a kanji was not the kanji pill. The
 * pill wants both facts, and they live on the server: kanji in the
 * dictionary, words and radicals in the catalogue by their subject id. A
 * list row stores neither, so they are looked up here, once per page, for
 * the items the cards actually show.
 */
export async function previewFactsFor(items: readonly StudyListItemRef[]): Promise<PreviewFacts> {
  const facts: PreviewFacts = {};
  const subjectIds: number[] = [];
  for (const item of items) {
    if (facts[item.key]) continue;
    if (item.reading || item.meaning) {
      facts[item.key] = { reading: item.reading ?? null, meaning: item.meaning ?? null };
      continue;
    }
    if (item.kind === LIST_ITEM_KINDS.kanji && Array.from(item.key).length === 1) {
      const entry = getKanjiDictionaryEntry(item.key);
      facts[item.key] = {
        reading: primaryKanjiReading(entry),
        meaning: entry?.primaryMeaning || entry?.meanings?.[0] || null,
      };
      continue;
    }
    if (item.subjectId) subjectIds.push(item.subjectId);
  }
  if (subjectIds.length > 0) {
    const details = await getCatalogSubjectDetails(subjectIds);
    for (const item of items) {
      if (facts[item.key] || !item.subjectId) continue;
      const detail = details.get(item.subjectId);
      if (!detail) continue;
      facts[item.key] = { reading: detail.primaryReadings[0] ?? null, meaning: detail.meanings[0] ?? null };
    }
  }
  return facts;
}
