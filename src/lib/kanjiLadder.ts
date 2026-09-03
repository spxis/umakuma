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
 * Vocabulary rides along: a word is never unlocked before every kanji in it,
 * and is held back beyond that when a level is already carrying its share.
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

const ladder = ladderData as KanjiLadder;

export const KANJI_LADDER_LEVELS = ladder.levels;
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

/** The ladder level that teaches a WaniKani vocabulary subject, if we teach it. */
export function vocabularyLevel(wkSubjectId: number): number | null {
  return ladder.vocabularyLevel[String(wkSubjectId)] ?? null;
}

/** Every kanji taught at or before `level`, in ladder order. */
export function kanjiThrough(level: number): string[] {
  if (!isKanjiLadderLevel(level)) return [];
  return ladder.ladder.slice(0, level).flatMap((entry) => entry.kanji);
}
