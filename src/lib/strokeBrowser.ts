import { getAllKanjiDictionaryEntries, primaryKanjiReading } from "./kanjiDictionary";
import { isTaughtKanji } from "./kanjiLadder";
import { strokesHref } from "./strokeAddress";

/**
 * Every kanji, by how many strokes it takes to write.
 *
 * The site groups kanji by what a learner is doing - the level they are on,
 * the year a child is taught them, the JLPT that will test them - and none of
 * those answer the question somebody has with a pen in their hand: what else
 * is written in this many strokes? The dictionary has known the stroke count
 * of all ten thousand characters from the day it was ingested.
 *
 * Commonest first, because that is the order a learner meets them: 12 strokes
 * is nine hundred characters, and the first screen should be the ones they
 * will actually see.
 *
 * **The kanji we teach, which is what the site's three types mean.** These
 * pages were built straight from KANJIDIC - ten thousand characters, of which
 * 8,150 are neither radical, kanji nor vocabulary in our terms, because they
 * are not in the curriculum at all. That is why six of the eight one-stroke
 * entries were components like "katakana no radical (no. 4)" wearing a KANJI
 * pill: nothing on the page had ever asked our own classification what these
 * characters were.
 *
 * John: "we have 3 things we teach. RADICALS KANJI and VOCAB. If it's not
 * KANJI, then it should have gone into the RADICALS section. And if it's a
 * radical, then it should not show up in the strokes."
 *
 * So the page asks `isTaughtKanji`, and the three types do the work. No rule
 * about what a radical looks like, and nothing listed by hand - a radical is
 * absent because it is not in the kanji ladder, and 人 is present because it
 * is, being one of the 164 characters the ladder holds twice: once as a
 * radical, once as a kanji.
 */
export const STROKE_PAGE_SIZE = 120;

export type StrokeEntry = {
  kanji: string;
  meaning: string;
  reading: string | null;
  strokeCount: number;
  /** Rank among the commonest 2,501; null past that. */
  frequencyRank: number | null;
  grade: number | null;
};

export type StrokeCount = { strokes: number; count: number };

function byFrequencyThenKanji(left: StrokeEntry, right: StrokeEntry): number {
  const leftRank = left.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return left.kanji.localeCompare(right.kanji, "ja");
}

function toEntry(entry: ReturnType<typeof getAllKanjiDictionaryEntries>[number]): StrokeEntry {
  return {
    kanji: entry.kanji,
    meaning: entry.primaryMeaning || entry.meanings[0] || "",
    reading: primaryKanjiReading(entry),
    strokeCount: entry.strokeCount ?? 0,
    frequencyRank: entry.frequencyRank,
    grade: entry.grade,
  };
}

/**
 * Every character the stroke pages will show.
 *
 * One filter, read by both the counts and the pages, because a chip saying
 * "1 8" over a page of four is worse than either number alone.
 */
function strokeBrowserEntries() {
  return getAllKanjiDictionaryEntries().filter((entry) => isTaughtKanji(entry.kanji));
}

/** How many kanji each stroke count holds, fewest strokes first. */
export function strokeCounts(): StrokeCount[] {
  const counts = new Map<number, number>();
  for (const entry of strokeBrowserEntries()) {
    if (entry.strokeCount === null) continue;
    counts.set(entry.strokeCount, (counts.get(entry.strokeCount) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([strokes, count]) => ({ strokes, count }))
    .sort((left, right) => left.strokes - right.strokes);
}

/**
 * The kanji written in this many strokes, commonest first.
 *
 * Everything, in one order. Which of them a reader wants to see - the common
 * ones, the ones WaniKani teaches, the ones on a JLPT list - is a question
 * `narrowBySources` answers over this, because the answer has to compose with
 * the parts filter and be counted against it.
 */
export function kanjiByStrokeCount(strokes: number): StrokeEntry[] {
  return strokeBrowserEntries()
    .filter((entry) => entry.strokeCount === strokes)
    .map(toEntry)
    .sort(byFrequencyThenKanji);
}

export function isStrokeCount(value: number): boolean {
  return strokeCounts().some((entry) => entry.strokes === value);
}

/**
 * The page of everything written in this many strokes, for a character that
 * has a page of its own.
 *
 * John, on 竃's stroke panel: "there's no link from the Kanji Stroke order
 * container to the Kanji in the Strokes page. There should be a relationship
 * that takes you right to it, the 17 strokes page."
 *
 * Null rather than a guess when no kanji we teach shares the count: 竈 takes
 * 21 strokes and the ladder has kanji at 21, but a 29-stroke character whose
 * count nothing else shares would otherwise point at a page that is a 404.
 * The link is offered only where there is something on the other end.
 */
export function strokesPageHref(count: number | null | undefined): string | null {
  return typeof count === "number" && isStrokeCount(count) ? strokesHref(count) : null;
}

/** One page of them, and how many pages there are. */
export function strokePage(entries: StrokeEntry[], page: number): { rows: StrokeEntry[]; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(entries.length / STROKE_PAGE_SIZE));
  const safe = Math.min(Math.max(1, page), pageCount);
  return { rows: entries.slice((safe - 1) * STROKE_PAGE_SIZE, safe * STROKE_PAGE_SIZE), pageCount };
}
