import { searchQueryVariants } from "./kana";

/**
 * Whether a subject answers a typed query, the way the main search reads it.
 *
 * The list viewer matched the raw string against the characters and the
 * English, so "water" found 水 and "mizu" found nothing, while the search
 * box on the same page found both. One reading of a query for every list:
 * romaji becomes kana and is tried against the readings, kana is tried in
 * both scripts, and the English is matched in lower case.
 */
export function subjectMatchesQuery(
  query: string,
  subject: { glyph: string; meanings: readonly string[]; readings: readonly (string | null)[] },
): boolean {
  const term = query.trim();
  if (term.length === 0) return true;
  const lower = term.toLowerCase();
  if (subject.meanings.some((meaning) => meaning.toLowerCase().includes(lower))) return true;

  const variants = searchQueryVariants(term);
  return variants.some(
    (variant) =>
      subject.glyph.includes(variant) ||
      subject.readings.some((reading) => reading !== null && reading.includes(variant)),
  );
}
