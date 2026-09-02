import { getAllKanjiDictionaryEntries } from "./kanjiDictionary";

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
    reading: entry.readings.on[0] ?? entry.readings.kun[0] ?? null,
    strokeCount: entry.strokeCount ?? 0,
    frequencyRank: entry.frequencyRank,
    grade: entry.grade,
  };
}

/** How many kanji each stroke count holds, fewest strokes first. */
export function strokeCounts(): StrokeCount[] {
  const counts = new Map<number, number>();
  for (const entry of getAllKanjiDictionaryEntries()) {
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
 * `commonOnly` keeps the ones a newspaper actually uses, which is the
 * difference between a page to study and a page to scroll: of the 925
 * twelve-stroke characters, a couple of hundred are in the frequency list.
 */
export function kanjiByStrokeCount(strokes: number, options: { commonOnly?: boolean } = {}): StrokeEntry[] {
  return getAllKanjiDictionaryEntries()
    .filter((entry) => entry.strokeCount === strokes)
    .map(toEntry)
    .filter((entry) => !options.commonOnly || entry.frequencyRank !== null)
    .sort(byFrequencyThenKanji);
}

export function isStrokeCount(value: number): boolean {
  return strokeCounts().some((entry) => entry.strokes === value);
}

/** One page of them, and how many pages there are. */
export function strokePage(entries: StrokeEntry[], page: number): { rows: StrokeEntry[]; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(entries.length / STROKE_PAGE_SIZE));
  const safe = Math.min(Math.max(1, page), pageCount);
  return { rows: entries.slice((safe - 1) * STROKE_PAGE_SIZE, safe * STROKE_PAGE_SIZE), pageCount };
}
