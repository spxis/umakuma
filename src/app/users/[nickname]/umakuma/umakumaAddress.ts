import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

/**
 * Where a level of our curriculum lives.
 *
 * One level to an address, the way `/grades/[grade]` and the JLPT lists work.
 * The explorer used to page ten levels at a time behind a single URL, so there
 * was no way to link to level 23, no way to come back to it, and no way for a
 * member to say which level they were looking at.
 */
export const UK_EXPLORER_PAGE = {
  tab: "UmaKuma",
  title: "UmaKuma Explorer",
  subtitle: "Our own hundred levels, radicals first.",
  path: "umakuma",
} as const;

export function umakumaLevelHref(nickname: string, level: number): string {
  return `/users/${encodeURIComponent(nickname)}/${UK_EXPLORER_PAGE.path}/${clampLadderLevel(level)}`;
}

/** A level from the address, or null when it names one the ladder has not got. */
export function parseLadderLevel(value: string | undefined): number | null {
  if (!value) return null;
  const level = Number(value);
  if (!Number.isInteger(level) || level < 1 || level > KANJI_LADDER_LEVELS) return null;
  return level;
}

/** The nearest level the ladder actually has. */
export function clampLadderLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(Math.max(1, Math.trunc(level)), KANJI_LADDER_LEVELS);
}
