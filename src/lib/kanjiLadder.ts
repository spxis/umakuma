/**
 * The UmaKuma kanji ladder: all 2,235 joyo kanji over 100 levels.
 *
 * Levels are deliberately lighter than WaniKani's 35 — a level gates on its
 * kanji reaching Guru, so 35 is a long wait for a win. Ours start at 6 and ramp
 * up, so a beginner's first wins come quickly.
 *
 * The ladder is ordered by JLPT band, so a member can say what they are ready
 * for: N5 is complete at level 10, N4 at 20, N3 at 35, N2 at 50, and the rest
 * of joyo by 100.
 *
 * Radicals come first: each is introduced at the level of the earliest kanji
 * built from it, so no kanji ever arrives carrying a piece never seen. They are
 * RADKFILE's 253, the set behind dictionary radical lookup — not WaniKani's 491
 * invented ones.
 *
 * Vocabulary rides along behind: a word is never unlocked before every kanji in
 * it, and is held back beyond that when a level is already carrying its share.
 *
 * Regenerate with `pnpm build:kanji-ladder` after a catalog export.
 */
import ladderData from "@/data/kanjiLadder.json";

import type {
  JlptNLevel,
  KanjiLadder,
  KanjiLadderLevel,
  KanjiLadderMilestone,
  KanjiLadderPlacement,
} from "./kanjiLadder.types";
import { CURRICULUM_VERSION_START } from "./ladder/curriculumVersion";

const ladder = ladderData as KanjiLadder;

export const KANJI_LADDER_LEVELS = ladder.levels;

/**
 * What version of the curriculum this build teaches.
 *
 * Separate from the site's release number on purpose: that one answers "what
 * code is running", this answers "has what I am being taught changed". A
 * member who returns to find three new kanji in a level they had finished
 * deserves to be told, and told in a way that distinguishes a wording fix from
 * a moved ladder.
 */
export const CURRICULUM_VERSION: string =
  (ladder as { curriculum?: { version?: string } }).curriculum?.version ?? CURRICULUM_VERSION_START;

export type CurriculumChangelogEntry = {
  version: string;
  date: string;
  bump: string;
  summary: string;
};

/** Newest first. Empty until a change has actually moved the version. */
export function curriculumChangelog(): CurriculumChangelogEntry[] {
  return ((ladder as { curriculum?: { changelog?: CurriculumChangelogEntry[] } }).curriculum?.changelog ?? []);
}
export const KANJI_LADDER_TOTAL = ladder.totalKanji;

export function isKanjiLadderLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= KANJI_LADDER_LEVELS;
}

/** The ladder level at which each JLPT level is fully covered. */
export function kanjiLadderMilestones(): KanjiLadderMilestone[] {
  return ladder.milestones;
}

/** The level a member must reach to have every kanji of a JLPT level. */
export function levelForJlpt(nLevel: JlptNLevel): number | null {
  return ladder.milestones.find((m) => m.nLevel === nLevel)?.completeAtLevel ?? null;
}

/**
 * The JLPT band that finishes *at* this level, if one does.
 *
 * Five levels in a hundred answer this: N5 at 10, N4 at 20, N3 at 35, N2 at
 * 50 and N1 at 100. Distinct from `jlptCompletedAt`, which is cumulative and
 * answers "what does a member hold by here" - true of every level from 10
 * onward, and so useless as a landmark.
 *
 * The distinction is not academic. The level picker marked a level whenever
 * any kanji on it carried a band, which put "N5 finishes here" on levels 2, 3,
 * 4, 5, 9 and 10 and "N1 finishes here" on all ten of 71-80. A band finishes
 * once.
 */
export function jlptCompletingAt(level: number): JlptNLevel | null {
  return ladder.milestones.find((milestone) => milestone.completeAtLevel === level)?.nLevel ?? null;
}

/** The JLPT level a member has fully covered at `level`, if any. */
export function jlptCompletedAt(level: number): JlptNLevel | null {
  const reached = ladder.milestones.filter((m) => m.completeAtLevel <= level);
  return reached.length === 0 ? null : reached[reached.length - 1].nLevel;
}

export function kanjiLadderLevels(): KanjiLadderLevel[] {
  return ladder.ladder;
}

export function kanjiLadderLevel(level: number): KanjiLadderLevel | null {
  return isKanjiLadderLevel(level) ? ladder.ladder[level - 1] : null;
}

/** Where a kanji sits on the ladder, or null when it is outside the joyo set. */
export function kanjiPlacement(kanji: string): KanjiLadderPlacement | null {
  return ladder.kanjiLevel[kanji] ?? null;
}

/**
 * Whether the curriculum teaches this character as a kanji.
 *
 * **A character can be both a radical and a kanji, and when it is, it is two
 * items.** 164 of them are: 一, 人, 力, 口, 十 are radicals a member learns as
 * components and kanji they later learn to read, and the ladder holds each
 * twice on purpose - the WaniKani model, and the reason `radicalLevel` and
 * `kanjiLevel` are separate maps rather than one type field. So "is it a
 * radical" never answers "is it a kanji"; only this does.
 *
 * This exists because a surface asking "is this a kanji" was reaching for
 * KANJIDIC, which is a dictionary of every character and knows nothing about
 * the three types we teach.
 */
export function isTaughtKanji(character: string): boolean {
  return ladder.kanjiLevel[character] !== undefined;
}

/**
 * The level a classical radical with no kanji is offered at.
 *
 * Twelve of RADKFILE's 253 appear in no character we teach, so nothing a
 * member learns depends on them. They are offered one per level across the end
 * of the ladder rather than dropped, so the set can be completed by anybody who
 * wants it — 龠 at level 100 is a curiosity, not a requirement.
 */
export function optionalRadicalLevel(radical: string): number | null {
  return (ladder.optionalRadicalLevel as Record<string, number>)[radical] ?? null;
}

/** Every classical radical a level offers, required and optional alike. */
export function radicalsOfferedAtLevel(level: number): { radical: string; optional: boolean }[] {
  const required = Object.entries(ladder.radicalLevel)
    .filter(([, at]) => at === level)
    .map(([radical]) => ({ radical, optional: false }));
  const extra = Object.entries(ladder.optionalRadicalLevel as Record<string, number>)
    .filter(([, at]) => at === level)
    .map(([radical]) => ({ radical, optional: true }));
  return [...required, ...extra];
}

/** The ladder level that introduces a RADKFILE radical. */
export function radicalLevel(radical: string): number | null {
  return ladder.radicalLevel[radical] ?? null;
}

/** Every radical introduced at `level`, for the kanji it teaches. */
export function radicalsAtLevel(level: number): string[] {
  return Object.entries(ladder.radicalLevel)
    .filter(([, at]) => at === level)
    .map(([radical]) => radical);
}

/** The ladder level that teaches a WaniKani vocabulary subject, if we teach it. */
export function vocabularyLevel(wkSubjectId: number): number | null {
  return ladder.vocabularyLevel[String(wkSubjectId)] ?? null;
}

/** Every kanji taught at or before `level`, in ladder order. */
export function kanjiThrough(level: number): string[] {
  if (!isKanjiLadderLevel(level)) return [];
  return ladder.ladder.slice(0, level).flatMap((entry) => entry.kanji);
}
