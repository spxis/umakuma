import { SUBJECT_TYPES, type SubjectType } from "./domainConstants";

/**
 * Which of the two the stroke pages are showing.
 *
 * Its own module, apart from `strokeBrowser`, because the filter row is drawn
 * in a client component and `strokeBrowser` reaches the dictionary and the
 * ladder - both server-only. A type import is erased and was fine; the moment
 * the row needed the values themselves, importing them dragged the whole
 * server tree into the browser bundle and the page returned 500.
 */
export const STROKE_TYPE_FILTERS = {
  all: "all",
  kanji: SUBJECT_TYPES.kanji,
  radical: SUBJECT_TYPES.radical,
} as const;

/*
 * Derived from the registry rather than written out again. Spelled as a union
 * it would have had to say "all" | "kanji" | "radical", and the third subject
 * type would then be a value the page could be asked for and has nothing to
 * show - these pages hold characters, and vocabulary is words.
 */
export const STROKE_TYPE_VALUES = Object.values(STROKE_TYPE_FILTERS);

export type StrokeTypeFilter = (typeof STROKE_TYPE_VALUES)[number];

/**
 * Kanji unless asked otherwise, and that is not an arbitrary default.
 *
 * John, when these pages were built straight from KANJIDIC and six of the
 * eight one-stroke entries were components wearing a KANJI pill: "we have 3
 * things we teach. RADICALS KANJI and VOCAB... if it's a radical, then it
 * should not show up in the strokes." Radicals are back because he later
 * asked for them with their own colour and a filter - but as something a
 * reader turns on, not as something that arrives unasked and puts 253
 * components back among the kanji.
 */
export const STROKE_TYPE_DEFAULT: StrokeTypeFilter = STROKE_TYPE_FILTERS.kanji;

export function isStrokeTypeFilter(value: string): value is StrokeTypeFilter {
  return (STROKE_TYPE_VALUES as readonly string[]).includes(value);
}

/** Never used here, but it keeps the subject-type import honest. */
export type StrokeSubjectType = SubjectType;
