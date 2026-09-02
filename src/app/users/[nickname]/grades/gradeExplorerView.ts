import type { SchoolGradeKanjiEntry, SchoolGradeReadings } from "@/lib/schoolGrades.types";

import { DEFAULT_GRADE, GRADE_PAGE_SIZE } from "./GradeExplorer.constants";

/** The grades the explorer offers, in the order a school year runs. */
export const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 9] as const;

export type GradeOption = (typeof GRADE_OPTIONS)[number];

/**
 * Chip labels. Grades 1-6 are school years; 8 and 9 are the KANJIDIC
 * convention for secondary joyo and jinmeiyo, which are not year numbers and
 * would read as "Grade 8" if labelled like one.
 */
export const GRADE_SHORT_LABELS: Record<GradeOption, string> = {
  1: "G1", 2: "G2", 3: "G3", 4: "G4", 5: "G5", 6: "G6",
  8: "Jr High", 9: "Name",
};

/** Whether the grid is showing readings or hiding them for self-testing. */
export const GRADE_REVEAL_MODES = { shown: "shown", hidden: "hidden" } as const;

export type GradeRevealMode = (typeof GRADE_REVEAL_MODES)[keyof typeof GRADE_REVEAL_MODES];

/** Remembered per surface, so quiz mode survives paging through a grade. */
export const GRADE_REVEAL_STORAGE_KEY = "wr:grades:reveal-mode";

/** Grid or list on the grade explorer, remembered per surface like the others. */
export const GRADE_VIEW_MODE_STORAGE_KEY = "wr:grades:view-mode";

export function isGradeOption(value: number): value is GradeOption {
  return (GRADE_OPTIONS as readonly number[]).includes(value);
}

/** The grade named by a query string, falling back to the opening grade. */
export function parseGradeParam(raw: string | undefined): GradeOption {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && isGradeOption(parsed) ? parsed : DEFAULT_GRADE;
}

export function parsePageParam(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

/**
 * The readings a grade actually examines.
 *
 * A kanji carries every reading it has, but a school year only teaches some of
 * them, and that narrower set is what a Grade 2 test asks for. Prefer the
 * grade-approved list and fall back to the full one only when the dataset has
 * no grade-specific entry, so a card never comes up empty.
 */
export function readingsForGrade(entry: SchoolGradeKanjiEntry): SchoolGradeReadings {
  const approved = entry.gradeApprovedReadings;
  const hasApproved = Boolean(approved && ((approved.on?.length ?? 0) > 0 || (approved.kun?.length ?? 0) > 0));
  const chosen = hasApproved && approved ? approved : entry.readings;
  return {
    on: standaloneReadings(chosen?.on),
    kun: standaloneReadings(chosen?.kun),
  };
}

/**
 * Drops the readings a character never has on its own.
 *
 * KANJIDIC marks compound-only forms with a hyphen on the side that must attach
 * to something else: `-のう` only exists inside a word like 親王, and `ほ-` only
 * as a prefix. Printing them as readings taught something false — 王 was shown
 * with a kun reading of のう when 王 has no kun reading at all.
 */
export function standaloneReadings(readings: string[] | undefined): string[] {
  return (readings ?? []).filter((reading) => !reading.includes("-"));
}

/**
 * Kun readings are written with a dot marking where the kanji stops and the
 * okurigana begins (`ひ.く`). The dot is a dictionary convention, not part of
 * the reading, so it is dropped for display.
 */
export function displayReading(reading: string): string {
  return reading.replace(/\./g, "");
}

/**
 * Where a grade lives.
 *
 * The grade is in the path because it says which collection you are looking
 * at - it is the thing being addressed, it is what somebody means when they
 * send the link, and it is what a cache can key on. Searching and paging stay
 * in the query, because they are how you are looking at that collection rather
 * than which one it is.
 */
export function gradeHref(nickname: string, grade: number, page = 1, search = ""): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search.trim()) params.set("q", search.trim());
  const query = params.toString();
  return `/users/${encodeURIComponent(nickname)}/grades/${grade}${query ? `?${query}` : ""}`;
}

/**
 * The grade named by a path segment, or null when the segment is not one.
 *
 * Unlike the query-string reader this refuses to guess: `/grades/practice` is
 * a different page and `/grades/nonsense` is a mistake, and quietly rendering
 * grade one for either would make a wrong link look like a working one.
 */
export function parseGradeSegment(raw: string | undefined): GradeOption | null {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && isGradeOption(parsed) ? parsed : null;
}

/** One-based range of the items on this page, for the "showing X-Y of Z" line. */
export function pageRange(page: number, total: number): { first: number; last: number } {
  if (total === 0) return { first: 0, last: 0 };
  const first = (page - 1) * GRADE_PAGE_SIZE + 1;
  return { first, last: Math.min(page * GRADE_PAGE_SIZE, total) };
}

/**
 * What the grade's search box offers as you type.
 *
 * Every other search here suggests what its surface holds; this one asked the
 * member to know the character already, which is the opposite of what a
 * learner opening grade four needs.
 *
 * All of them, in the order the grade teaches them, rather than a capped
 * sample: the search itself reads the whole grade, so a suggestion list that
 * held only part of it would be a half-truth about what typing will find.
 * Junior high is the expensive one at 1,110 characters - about 36KB of
 * options, a quarter of that over the wire - and it is the grade where
 * knowing what is in there is worth the most.
 *
 * Deliberately not sorted by frequency: no entry in this catalogue carries a
 * frequency rank, so ordering by one would only shuffle the list into
 * dictionary order while claiming to rank it.
 */
export function gradeSearchSuggestions(
  entries: readonly SchoolGradeKanjiEntry[],
): { value: string; label: string }[] {
  return entries.map((entry) => ({ value: entry.kanji, label: entry.primaryMeaning ?? "" }));
}
