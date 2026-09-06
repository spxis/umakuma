/**
 * UG: the same curriculum, ordered the way a Japanese school teaches it.
 *
 * UmaKuma has two ladders over one set of subjects. UK orders by JLPT band, so
 * a member always knows which exam they could sit. UG orders by school year, so
 * a member in a Japanese classroom — or a parent watching one — can read their
 * level as the year their class is in. Nothing extra is taught in either: the
 * same 2,235 kanji, the same 253 radicals, the same 6,795 words, in a different
 * sequence.
 *
 * The promise is what differs, and each ladder can only keep its own. UG
 * finishes grade one at level 5, where UK does not finish it until 36. UK
 * finishes N4 at 20, where UG does not until 43. That is the trade, and it is
 * why there are two rather than one bent into both shapes.
 *
 * Its own shape, in three parts: level 1 is radicals and no kanji (grade one is
 * written with 74 distinct radicals, and a first level of twenty kanji would
 * arrive carrying pieces nobody had seen); levels 2-51 are the six school years,
 * each a whole number of levels so no level straddles two years; then the
 * characters an exam wants before N1 that no primary school teaches; then the
 * rest. A hundred levels, because the vocabulary needs them even though the
 * kanji would fit in eighty-seven.
 *
 * Regenerate with `pnpm build:kanji-ladder`, which writes both ladders from one
 * pass so they cannot drift.
 */
import gradeLadderData from "@/data/gradeLadder.json";

import type {
  GradeLadder,
  GradeLadderLevel,
  GradeLadderPlacement,
  GradeMilestone,
  SchoolGrade,
} from "./gradeLadder.types";
import { CURRICULUM_VERSION_START } from "./ladder/curriculumVersion";

const ladder = gradeLadderData as GradeLadder;

export const GRADE_LADDER_LEVELS = ladder.levels;

/**
 * The version of the UG ladder as shipped, for stamping a figure with it.
 *
 * The mirror of `CURRICULUM_VERSION` in `kanjiLadder.ts`: both ladders move
 * when the evidence says to, and AGENTS.md holds every chart, table and
 * answer to naming the one it was drawn from. A number nobody can reproduce
 * is the thing that rule exists to prevent.
 */
export const GRADE_CURRICULUM_VERSION: string =
  (gradeLadderData as { curriculum?: { version?: string } }).curriculum?.version ?? CURRICULUM_VERSION_START;

/** The school years, which is what this ladder is ordered by. */
export const SCHOOL_GRADES: readonly SchoolGrade[] = [1, 2, 3, 4, 5, 6];

export function isGradeLadderLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= GRADE_LADDER_LEVELS;
}

/** Where each school year finishes. Always a level boundary, never mid-level. */
export function gradeMilestones(): GradeMilestone[] {
  return ladder.gradeMilestones;
}

/** Where the JLPT bands land on this ordering, for comparing the two ladders. */
export function jlptMilestonesOnGradeLadder(): GradeLadder["milestones"] {
  return ladder.milestones;
}

/** Where a kanji sits on the grade ladder, or null for one it does not teach. */
export function gradePlacement(character: string): GradeLadderPlacement | null {
  return ladder.kanjiLevel[character] ?? null;
}

/** The level a word is unlocked at; never before every kanji in it. */
export function gradeVocabularyLevel(wkSubjectId: number): number | null {
  return ladder.vocabularyLevel[String(wkSubjectId)] ?? null;
}

/** The level a radical is introduced at — two before the first kanji using it. */
export function gradeRadicalLevel(radical: string): number | null {
  return ladder.radicalLevel[radical] ?? ladder.optionalRadicalLevel[radical] ?? null;
}

export function gradeLadderLevel(level: number): GradeLadderLevel | null {
  return ladder.ladder[level - 1] ?? null;
}

/**
 * The school year a level teaches, or null.
 *
 * Null is a real answer twice over: level 1 has no kanji at all, and past grade
 * six the ladder is no longer following school years.
 */
export function gradeOfLevel(level: number): SchoolGrade | null {
  return gradeLadderLevel(level)?.grade ?? null;
}

export function gradeLadderGeneratedAt(): string {
  return ladder.generatedAt;
}

export type { GradeLadderLevel, GradeLadderPlacement, GradeMilestone, SchoolGrade };
