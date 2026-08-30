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

type GradeFile = {
  grade: number;
  viewBox: string;
  attribution: StrokeOrderAttribution;
  kanji: StrokeOrderEntry[];
};

const DATA_DIR = path.join(process.cwd(), "src", "data", "stroke-order");

/**
 * One grade's strokes, kept once loaded.
 *
 * The whole set is about 3MB and the secondary-school file alone is 1.3MB, far
 * too much to hand a page. A character's grade is already known from the school
 * catalogue, so only the grade that was asked for is ever read, and a viewer
 * looking at first-grade kanji never pays for the rest.
 */
const cache = new Map<number, Map<string, StrokeOrderEntry>>();
let cachedViewBox: string | null = null;
let cachedAttribution: StrokeOrderAttribution | null = null;

function loadGrade(grade: number): Map<string, StrokeOrderEntry> | null {
  const cached = cache.get(grade);
  if (cached) {
    return cached;
  }

  const file = path.join(DATA_DIR, `grade-${String(grade).padStart(2, "0")}.json`);
  let parsed: GradeFile;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8")) as GradeFile;
  } catch {
    return null;
  }

  cachedViewBox = parsed.viewBox;
  cachedAttribution = parsed.attribution;
  const byKanji = new Map(parsed.kanji.map((entry) => [entry.kanji, entry]));
  cache.set(grade, byKanji);
  return byKanji;
}

/** Every grade file the build produced, in school order. */
export const STROKE_ORDER_GRADES = [1, 2, 3, 4, 5, 6, 8, 9] as const;

/**
 * The strokes for one character, searched grade by grade.
 *
 * Callers that know the grade should pass it: without one this walks the files
 * in school order, which finds a first-grade character immediately and only
 * reaches the large secondary file for characters that are actually in it.
 */
export function getStrokeOrder(kanji: string, grade?: number): StrokeOrderPayload | null {
  const order = typeof grade === "number" ? [grade, ...STROKE_ORDER_GRADES] : STROKE_ORDER_GRADES;

  for (const candidate of order) {
    const entry = loadGrade(candidate)?.get(kanji);
    if (entry && cachedViewBox && cachedAttribution) {
      return { ...entry, viewBox: cachedViewBox, attribution: cachedAttribution };
    }
  }

  return null;
}

/** The credit KanjiVG's licence requires, for the surfaces that show strokes. */
export function strokeOrderAttribution(): StrokeOrderAttribution | null {
  if (!cachedAttribution) {
    loadGrade(1);
  }
  return cachedAttribution;
}
