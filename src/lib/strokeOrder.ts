import "server-only";

import fs from "node:fs";
import path from "node:path";

export type StrokeOrderAttribution = {
  source: string;
  url: string;
  licence: string;
  licenceUrl: string;
  commit: string;
};

export type StrokeOrderEntry = {
  kanji: string;
  strokes: string[];
  strokeCount: number;
};

export type StrokeOrderPayload = StrokeOrderEntry & {
  viewBox: string;
  attribution: StrokeOrderAttribution;
};

type StrokeFile = {
  /** The school year these belong to, or null for the characters no year covers. */
  grade: number | null;
  viewBox: string;
  attribution: StrokeOrderAttribution;
  kanji: StrokeOrderEntry[];
};

type StrokeIndexFile = {
  grade: number | null;
  file: string;
  count: number;
  /** Every character in that file, so a lookup opens one file and no more. */
  characters: string;
};

type StrokeIndex = {
  viewBox: string;
  attribution: StrokeOrderAttribution;
  files: StrokeIndexFile[];
};

const DATA_DIR = path.join(process.cwd(), "src", "data", "stroke-order");

/**
 * One file's strokes, kept once loaded.
 *
 * The whole set is 7.4MB and the secondary-school file alone is 1.3MB, far too
 * much to hand a page. The index says which file holds a character, so a
 * lookup reads one of eighteen and a viewer looking at first-grade kanji never
 * pays for the rest.
 */
const cache = new Map<string, Map<string, StrokeOrderEntry>>();
let cachedIndex: StrokeIndex | null = null;
let cachedViewBox: string | null = null;
let cachedAttribution: StrokeOrderAttribution | null = null;

function loadIndex(): StrokeIndex | null {
  if (cachedIndex) return cachedIndex;

  try {
    cachedIndex = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "index.json"), "utf8")) as StrokeIndex;
  } catch {
    return null;
  }

  cachedViewBox ??= cachedIndex.viewBox;
  cachedAttribution ??= cachedIndex.attribution;
  return cachedIndex;
}

function loadFile(file: string): Map<string, StrokeOrderEntry> | null {
  const cached = cache.get(file);
  if (cached) return cached;

  let parsed: StrokeFile;
  try {
    parsed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as StrokeFile;
  } catch {
    return null;
  }

  cachedViewBox = parsed.viewBox;
  cachedAttribution = parsed.attribution;
  const byKanji = new Map(parsed.kanji.map((entry) => [entry.kanji, entry]));
  cache.set(file, byKanji);
  return byKanji;
}

/** The school years that have a file of their own. Bucket 0 is the WaniKani
 * extras no year covers; everything else with no year is in `other-NN`. */
export const STROKE_ORDER_GRADES = [0, 1, 2, 3, 4, 5, 6, 8, 9] as const;

/**
 * The strokes for one character, from the one file that holds it.
 *
 * The index is asked first and answers for all 6,415, so the grade argument is
 * a hint rather than a route: it is kept because callers know a character's
 * year and it costs nothing, and because it is the fallback if the index is
 * ever missing.
 *
 * The set used to be the 2,919 characters our own catalogues teach, so every
 * other page said "No stroke order for this character" - while Jisho drew the
 * same character from this same KanjiVG commit. It is now every character
 * KANJIDIC describes that KanjiVG draws.
 */
export function getStrokeOrder(kanji: string, grade?: number): StrokeOrderPayload | null {
  const holder = loadIndex()?.files.find((file) => file.characters.includes(kanji));
  const files = holder
    ? [holder.file]
    : (typeof grade === "number" ? [grade, ...STROKE_ORDER_GRADES] : STROKE_ORDER_GRADES).map(
        (candidate) => `grade-${String(candidate).padStart(2, "0")}.json`,
      );

  for (const file of files) {
    const entry = loadFile(file)?.get(kanji);
    if (entry && cachedViewBox && cachedAttribution) {
      return { ...entry, viewBox: cachedViewBox, attribution: cachedAttribution };
    }
  }

  return null;
}

/** How many characters have strokes, and which KanjiVG commit drew them. */
export function strokeOrderSummary(): { characterCount: number; commit: string } | null {
  const index = loadIndex();
  if (!index) return null;

  return {
    characterCount: index.files.reduce((total, file) => total + file.count, 0),
    commit: index.attribution.commit,
  };
}

/** The credit KanjiVG's licence requires, for the surfaces that show strokes. */
export function strokeOrderAttribution(): StrokeOrderAttribution | null {
  if (!cachedAttribution) loadIndex();
  return cachedAttribution;
}
