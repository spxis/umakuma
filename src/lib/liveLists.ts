/**
 * Lists nobody owns, that write themselves.
 *
 * Grade 1 is whatever the grade table says today; N3 is whatever the JLPT
 * table says. They are not snapshots taken once and left to rot - they are a
 * question stored as a list, asked again every time somebody opens one, so
 * they change when the data does.
 *
 * That is the one place the items model needed a second shape. A saved list
 * is rows; a live list is a source and a level, and its rows are found. Copy
 * one and you get rows - yours from that moment, yours to cut down to half of
 * Grade 1, or to Grade 1 minus what you already know.
 */

export const LIVE_LIST_SOURCES = { jlpt: "jlpt", grade: "grade", wk: "wk" } as const;
export type LiveListSource = (typeof LIVE_LIST_SOURCES)[keyof typeof LIVE_LIST_SOURCES];

export type LiveList = {
  /** The address and the stored key: `jlpt-n5`, `grade-1`, `wk-12`. */
  key: string;
  source: LiveListSource;
  level: number;
  name: string;
  description: string;
};

/** The JLPT runs N5 (easiest) to N1; the grades run 1 to 6 and then junior high. */
const JLPT_LEVELS = [5, 4, 3, 2, 1] as const;
const SCHOOL_GRADES = [1, 2, 3, 4, 5, 6, 8] as const;
export const WANIKANI_LEVEL_COUNT = 60;

/** Grade 8 is the junior-high set in the catalogue, which is not a year. */
export function schoolGradeName(grade: number): string {
  return grade === 8 ? "Junior high kanji" : `Grade ${grade} kanji`;
}

export const LIVE_LISTS: readonly LiveList[] = [
  ...JLPT_LEVELS.map((level) => ({
    key: `${LIVE_LIST_SOURCES.jlpt}-n${level}`,
    source: LIVE_LIST_SOURCES.jlpt,
    level,
    name: `JLPT N${level}`,
    description: `Every kanji the JLPT lists at N${level}, commonest first.`,
  })),
  ...SCHOOL_GRADES.map((grade) => ({
    key: `${LIVE_LIST_SOURCES.grade}-${grade}`,
    source: LIVE_LIST_SOURCES.grade,
    level: grade,
    name: schoolGradeName(grade),
    description:
      grade === 8
        ? "The kanji Japanese children are taught in junior high."
        : `The kanji Japanese children are taught in year ${grade}.`,
  })),
  ...Array.from({ length: WANIKANI_LEVEL_COUNT }, (_, index) => index + 1).map((level) => ({
    key: `${LIVE_LIST_SOURCES.wk}-${level}`,
    source: LIVE_LIST_SOURCES.wk,
    level,
    name: `WaniKani level ${level}`,
    description: `Every radical, kanji and word WaniKani teaches at level ${level}.`,
  })),
];

const BY_KEY = new Map(LIVE_LISTS.map((list) => [list.key, list]));

export function liveListByKey(key: string | null | undefined): LiveList | null {
  return key ? BY_KEY.get(key.trim().toLowerCase()) ?? null : null;
}

/** Public, and owned by nobody, so it sits outside anybody's pages. */
export function liveListHref(key: string): string {
  return `/lists/${encodeURIComponent(key)}`;
}

export const LIVE_LISTS_HREF = "/lists";

/** The groups the index offers them in, in the order a learner meets them. */
export function liveListsBySource(): { source: LiveListSource; lists: LiveList[] }[] {
  return [LIVE_LIST_SOURCES.jlpt, LIVE_LIST_SOURCES.grade, LIVE_LIST_SOURCES.wk].map((source) => ({
    source,
    lists: LIVE_LISTS.filter((list) => list.source === source),
  }));
}
