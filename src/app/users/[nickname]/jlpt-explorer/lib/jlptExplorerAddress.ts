import type { JlptFilter } from "../components/JlptExplorerContent.types";

/**
 * The JLPT explorer's filters, in its address.
 *
 * Choosing N5 changed nothing about the URL, so a filtered view could not be
 * linked, bookmarked or reloaded - the other explorers became real routes
 * with their filters in the address, and this one had not followed. The
 * filters are still remembered per browser; the address wins when it says
 * something, and says nothing about a filter left at its default, so a plain
 * link stays plain.
 *
 * Pure, so the reading and the writing can be tested against each other.
 */

export const JLPT_N_LEVELS = [1, 2, 3, 4, 5] as const;
export const JLPT_FILTER_VALUES: readonly JlptFilter[] = ["all", "kanji", "none"];

/** A level or grade filter: a number, "none" for items that have none, or off. */
export type LevelOrNone = number | "none" | null;

export type JlptFilterState = {
  levels: Set<number>;
  stickyLevels: boolean;
  wkFilter: JlptFilter;
  wkLevelFilter: LevelOrNone;
  gradeFilter: LevelOrNone;
};

/** What an address may say; a field it does not mention is left to the browser's memory. */
export type JlptFilterAddress = Partial<JlptFilterState>;

export const JLPT_ADDRESS_PARAMS = {
  levels: "n",
  sticky: "sticky",
  wk: "wk",
  wkLevel: "wkLevel",
  grade: "grade",
} as const;

export function defaultJlptLevels(): Set<number> {
  return new Set(JLPT_N_LEVELS);
}

function readLevelOrNone(raw: string | null): LevelOrNone | undefined {
  if (raw === null) return undefined;
  if (raw === "none") return "none";
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function readJlptFilterAddress(params: URLSearchParams): JlptFilterAddress {
  const address: JlptFilterAddress = {};

  const rawLevels = params.get(JLPT_ADDRESS_PARAMS.levels);
  if (rawLevels !== null) {
    const levels = rawLevels
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((level): level is (typeof JLPT_N_LEVELS)[number] => (JLPT_N_LEVELS as readonly number[]).includes(level));
    if (levels.length > 0) address.levels = new Set(levels);
  }

  const rawSticky = params.get(JLPT_ADDRESS_PARAMS.sticky);
  if (rawSticky === "1" || rawSticky === "0") address.stickyLevels = rawSticky === "1";

  const rawWk = params.get(JLPT_ADDRESS_PARAMS.wk);
  if (rawWk !== null && (JLPT_FILTER_VALUES as readonly string[]).includes(rawWk)) address.wkFilter = rawWk as JlptFilter;

  const wkLevel = readLevelOrNone(params.get(JLPT_ADDRESS_PARAMS.wkLevel));
  if (wkLevel !== undefined) address.wkLevelFilter = wkLevel;

  const grade = readLevelOrNone(params.get(JLPT_ADDRESS_PARAMS.grade));
  if (grade !== undefined) address.gradeFilter = grade;

  return address;
}

function setOrDrop(params: URLSearchParams, key: string, value: string | null): void {
  if (value === null) params.delete(key);
  else params.set(key, value);
}

/**
 * Write the filters into an address, saying only what is not the default.
 *
 * Every level on, no WaniKani filter, no level or grade filter, levels not
 * sticky: that is the explorer as it opens, and an address that spelled it
 * out would be longer and no more precise.
 */
export function writeJlptFilterAddress(params: URLSearchParams, state: JlptFilterState): void {
  const levels = [...state.levels].sort((left, right) => left - right);
  const everyLevel = levels.length === JLPT_N_LEVELS.length;
  setOrDrop(params, JLPT_ADDRESS_PARAMS.levels, everyLevel ? null : levels.join(","));
  setOrDrop(params, JLPT_ADDRESS_PARAMS.sticky, state.stickyLevels ? "1" : null);
  setOrDrop(params, JLPT_ADDRESS_PARAMS.wk, state.wkFilter === "all" ? null : state.wkFilter);
  setOrDrop(params, JLPT_ADDRESS_PARAMS.wkLevel, state.wkLevelFilter === null ? null : String(state.wkLevelFilter));
  setOrDrop(params, JLPT_ADDRESS_PARAMS.grade, state.gradeFilter === null ? null : String(state.gradeFilter));
}
