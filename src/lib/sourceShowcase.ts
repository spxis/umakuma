import { SOURCE_KEYS, type SourceKey } from "./sourceCredits";

/**
 * A few real rows from each source, chosen rather than taken.
 *
 * The accreditation pages say what we hold from a source and never show any of
 * it, which asks a reader to take the numbers on trust. A handful of specimens
 * is the difference between "6,204 words with a frequency band" and seeing that
 * 新聞 sits in the top 500.
 *
 * They are picked, never sampled off the top. The first row of any of these
 * files is an accident of sort order - RADKFILE opens on a stroke fragment,
 * JMdict on a particle - and shows nothing. A chosen row can show the thing
 * that makes the source worth having: 鬱 for a dictionary that knows 29-stroke
 * characters, 俺 for a corpus that hears what newspapers do not print.
 *
 * These are the defaults. An admin may override any source's picks, which is
 * why the shape is data and not prose.
 */
export type ShowcaseRow = {
  /** The specimen: a character, a word, a sentence, a region. */
  specimen: string;
  /** What this source holds about it, in a few words. */
  detail: string;
  /** Why this row was worth choosing, where that is not obvious. */
  note?: string;
};

/** How many rows a source may show. Enough to be a taste, not a table. */
export const SHOWCASE_MAX_ROWS = 4;

/**
 * The chosen rows, one set per source.
 *
 * Each pick earns its place by showing something the count cannot: the range a
 * source covers, the register it hears, or the reason we hold it at all.
 */
export const SHOWCASE_DEFAULTS: Record<SourceKey, ShowcaseRow[]> = {
  [SOURCE_KEYS.wanikani]: [
    { specimen: "力", detail: "Level 1 · power", note: "One of the eighteen kanji they open with." },
    { specimen: "曜", detail: "Level 16 · day of the week", note: "Built from sun, wolverine and turkey. Their radical names are inventions, and this is what the inventions buy." },
    { specimen: "鬱", detail: "Level 50 · gloom", note: "Twenty-nine strokes, the most complex character they teach." },
  ],
  [SOURCE_KEYS.kanjidic2]: [
    { specimen: "鬱", detail: "29 strokes · jōyō, and unranked in print", note: "The most complex character in common use, and too rare to make the frequency table at all." },
    { specimen: "一", detail: "1 stroke · frequency rank 2", note: "The simplest character there is, and the second commonest in print." },
    { specimen: "畑", detail: "Grade 3 · field", note: "Made in Japan, so it has no Chinese reading at all." },
  ],
  [SOURCE_KEYS.radkfile]: [
    { specimen: "口", detail: "3 strokes · in 1,337 characters", note: "The component that turns up almost everywhere." },
    { specimen: "龠", detail: "17 strokes · in 3 characters", note: "And one that almost never does." },
  ],
  [SOURCE_KEYS.kanjivg]: [
    { specimen: "永", detail: "5 strokes, drawn in order", note: "The character calligraphy uses to teach the basic strokes." },
    { specimen: "凸", detail: "5 strokes · convex", note: "Its stroke order surprises nearly everyone." },
  ],
  [SOURCE_KEYS.kanjiapi]: [
    { specimen: "水", detail: "N5 · water", note: "Among the first kanji an exam expects." },
    { specimen: "鑑", detail: "N1 · specimen, take warning from", note: "And among the last, at 23 strokes." },
  ],
  [SOURCE_KEYS.tatoeba]: [
    { specimen: "犬が好きです。", detail: "I like dogs.", note: "Short enough to read on day one." },
    { specimen: "君のせっかくの名講義は猫に小判だったね。", detail: "Your wonderful lecture was pearls before swine.", note: "The pairs are translations rather than glosses, so an idiom comes back as an idiom." },
  ],
  [SOURCE_KEYS.jmdict]: [
    { specimen: "新聞", detail: "Band 1 of 48 · the top 500 in print", note: "Newspaper, which is fittingly what the corpus is made of." },
    { specimen: "閣議", detail: "Band 2 in print · rank 58,336 in anime", note: "Cabinet meeting. The register a newspaper corpus sees and a subtitle corpus never will." },
  ],
  [SOURCE_KEYS.jiten]: [
    { specimen: "俺", detail: "Rank 67 in anime · band 12 of 48 in print", note: "A pronoun almost nobody writes and everybody says." },
    { specimen: "悪い", detail: "Rank 132 in anime · band 48 of 48 in print", note: "A day-one adjective the newspaper list nearly forgets." },
  ],
  [SOURCE_KEYS.kanjiConfusion]: [
    { specimen: "土 / 士", detail: "Identical but for the length of two strokes", note: "We teach one at level 5 and the other at 52, so a member meets the second knowing the first." },
    { specimen: "未 / 末", detail: "The same character with the long stroke moved", note: "Both N3, both level 26 — the one pair on this list a learner meets together." },
    { specimen: "田 / 由", detail: "One stroke through the top, or not", note: "A pair no component breakdown can tell apart, because they have the same components." },
  ],
  [SOURCE_KEYS.curriculum]: [
    { specimen: "一", detail: "Grade 1", note: "Taught in the first year of school." },
    { specimen: "亀", detail: "Secondary school · frequency rank 1,353", note: "Turtle, held back past primary school though every child knows the word." },
  ],
  [SOURCE_KEYS.jpmap]: [
    { specimen: "沖縄県", detail: "Okinawa · no land borders", note: "Drawn in an inset: in place it stretches the frame until the mainland is unreadable." },
    { specimen: "長野県", detail: "Nagano · 8 land borders", note: "It touches more prefectures than any other." },
  ],
  [SOURCE_KEYS.usmap]: [
    { specimen: "Tennessee", detail: "8 land borders", note: "Tied with Missouri for the most neighbours." },
    { specimen: "Alaska", detail: "No land borders", note: "Its only neighbour is Canada, which this map does not draw." },
  ],
  [SOURCE_KEYS.worldmap]: [
    { specimen: "United Kingdom", detail: "232 divisions drawn", note: "The most finely divided of the thirty countries this dataset gives us." },
    { specimen: "Austria", detail: "9 divisions drawn", note: "And the least." },
    { specimen: "Prince Edward Island", detail: "No land borders", note: "The only Canadian province you cannot walk into." },
  ],
};

/**
 * The rows to show for a source: an admin's picks where they exist and parse,
 * otherwise the chosen defaults.
 *
 * A stored value is never trusted. It is written by an admin through a form and
 * read on a public page, so a row that has lost its shape falls back rather than
 * rendering half a card or throwing on a page nobody can then fix.
 */
export function resolveShowcase(key: SourceKey, stored: string | null | undefined): ShowcaseRow[] {
  const fallback = SHOWCASE_DEFAULTS[key] ?? [];
  if (!stored) return fallback;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return fallback;
    const rows = parsed.filter(isShowcaseRow).slice(0, SHOWCASE_MAX_ROWS);
    return rows.length > 0 ? rows : fallback;
  } catch {
    return fallback;
  }
}

function isShowcaseRow(value: unknown): value is ShowcaseRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  const optionalNote = row.note === undefined || typeof row.note === "string";
  return typeof row.specimen === "string" && row.specimen.length > 0
    && typeof row.detail === "string" && row.detail.length > 0
    && optionalNote;
}

/** Where an admin's picks for a source are stored. */
export function showcaseSettingKey(key: SourceKey): string {
  return `sources:showcase:${key}`;
}
