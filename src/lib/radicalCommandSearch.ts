import { SEARCH_SOURCES, type SearchHit } from "./globalSearch";
import { SUBJECT_TYPES } from "./domainConstants";
import { getKanjiDictionaryEntry } from "./kanjiDictionary";
import { runRadicalSearch } from "./radicalSearchServer";

/**
 * A radical command, answered as ordinary search results.
 *
 * The picker used to show its own answer inside itself, which made the radical
 * lookup the one search on the site whose results did not look like results:
 * no kind tabs, no columns, no keyboard, no filing column, no way to open a row
 * the way every other row opens. Answering through the same path costs nothing
 * and hands all of that over at once.
 *
 * The rows are dictionary rows because that is what they are - characters, from
 * the reference the site already ships - and ranked by the picker's own order,
 * which is commonest first. The score counts down from the top rather than
 * being computed from the query, since "how well does this match" is not a
 * question an intersection asks: a kanji either holds every chosen radical or
 * it is not here at all.
 */
export async function radicalCommandHits(radicals: readonly string[]): Promise<SearchHit[]> {
  if (radicals.length === 0) return [];

  const { matches } = await runRadicalSearch(radicals);

  return matches.map((match, index) => {
    const entry = getKanjiDictionaryEntry(match.kanji);
    const readings = entry ? [...entry.readings.on, ...entry.readings.kun] : [];

    return {
      source: SEARCH_SOURCES.dictionary,
      key: `dictionary:${match.kanji}`,
      glyph: match.kanji,
      subjectType: SUBJECT_TYPES.kanji,
      slug: null,
      meaning: match.meaning,
      reading: readings.length > 0 ? readings.join("、") : null,
      badges: match.frequencyRank ? [`#${match.frequencyRank}`] : [],
      href: null,
      /* Ranked by the order the picker chose, not by a text match. */
      score: matches.length - index,
    } satisfies SearchHit;
  });
}
