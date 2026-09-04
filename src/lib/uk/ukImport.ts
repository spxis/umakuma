import { SUBJECT_TYPES } from "@/lib/domainConstants";

import { UK_LEVEL_PASS_SRS_STAGE, type UkLevelTotals } from "./ukLevel";

/**
 * Bringing a WaniKani member's progress onto our ladder.
 *
 * The problem this solves is the one that would otherwise lose us every
 * WaniKani user who tries the site: they arrive with forty levels of work
 * behind them and start at UK1 relearning 一.
 *
 * It does **not** invent a level from their WaniKani level. WaniKani's order
 * and ours differ — we teach by JLPT band and school grade, they teach by
 * their own sequence — so their level 20 scatters across ours. Instead every
 * item's stage is carried across one for one, and the level falls out of that
 * the same way it does for anybody else: a level clears when 90% of its kanji
 * have reached Guru. A WaniKani member typically lands *inside* a level with
 * most of it already done, and the rest arrives as lessons. That is the honest
 * credit for what they know, rather than a synthetic number.
 *
 * `srs_stage` is copied rather than mapped because the two scales are the same
 * nine stages with the same intervals — that is why `srsSchedule.ts` uses
 * WaniKani's table.
 */

export type WanikaniAssignment = {
  subjectId: number;
  srsStage: number;
  unlockedAt: Date | null;
  startedAt: Date | null;
  passedAt: Date | null;
  burnedAt: Date | null;
  availableAt: Date | null;
};

export type UkImportTarget = {
  /** Our row id. */
  subjectId: number;
  wkSubjectId: number;
  kind: string;
  level: number;
};

export type UkImportState = {
  subjectId: number;
  srsStage: number;
  unlockedAt: Date | null;
  startedAt: Date | null;
  passedAt: Date | null;
  burnedAt: Date | null;
  availableAt: Date | null;
};

export type UkImportPlan = {
  states: UkImportState[];
  /** The level the imported progress earns. Never lowers an existing floor. */
  floor: number;
  /** What was carried, for telling a member what just happened. */
  summary: {
    matched: number;
    /** Assignments with no item on our ladder — WaniKani's drawn-only radicals. */
    unmatched: number;
    skippedNotHigher: number;
    levelsCleared: number;
  };
};

/** Only progress worth carrying: an unstarted assignment says nothing. */
const MIN_STAGE = 1;

/**
 * Raise-only.
 *
 * An existing row that has been reviewed here is the member's own work on our
 * ladder, and an import must never walk it back — a re-import after six months
 * of study here would otherwise reset them to whatever WaniKani last knew.
 */
function shouldCarry(existing: { srsStage: number; lastReviewedAt: Date | null } | undefined, incoming: number): boolean {
  if (!existing) return true;
  if (existing.lastReviewedAt !== null) return false;
  return incoming > existing.srsStage;
}

export function planWanikaniImport({
  assignments,
  targets,
  totals,
  existing = new Map(),
  maxLevel,
}: {
  assignments: readonly WanikaniAssignment[];
  targets: readonly UkImportTarget[];
  totals: readonly UkLevelTotals[];
  existing?: Map<number, { srsStage: number; lastReviewedAt: Date | null }>;
  maxLevel: number;
}): UkImportPlan {
  const byWkId = new Map(targets.map((target) => [target.wkSubjectId, target]));
  const states: UkImportState[] = [];
  const stageBySubject = new Map<number, number>();
  let unmatched = 0;
  let skippedNotHigher = 0;

  for (const assignment of assignments) {
    if (assignment.srsStage < MIN_STAGE) continue;
    const target = byWkId.get(assignment.subjectId);
    if (!target) {
      unmatched += 1;
      continue;
    }
    if (!shouldCarry(existing.get(target.subjectId), assignment.srsStage)) {
      skippedNotHigher += 1;
      continue;
    }
    states.push({
      subjectId: target.subjectId,
      srsStage: assignment.srsStage,
      unlockedAt: assignment.unlockedAt,
      startedAt: assignment.startedAt,
      passedAt: assignment.passedAt,
      burnedAt: assignment.burnedAt,
      availableAt: assignment.availableAt,
    });
    stageBySubject.set(target.subjectId, assignment.srsStage);
  }

  /* The floor walks the same 90%-of-a-level's-kanji rule the derived level
     uses, so an import cannot buy a level that studying here would not. */
  const passedByLevel = new Map<number, number>();
  for (const target of targets) {
    if (target.kind !== SUBJECT_TYPES.kanji) continue;
    const stage = stageBySubject.get(target.subjectId) ?? existing.get(target.subjectId)?.srsStage ?? 0;
    if (stage < UK_LEVEL_PASS_SRS_STAGE) continue;
    passedByLevel.set(target.level, (passedByLevel.get(target.level) ?? 0) + 1);
  }

  const totalsByLevel = new Map(totals.map((entry) => [entry.level, entry]));
  let floor = 1;
  for (let level = 1; level <= maxLevel; level += 1) {
    const need = totalsByLevel.get(level)?.kanji ?? 0;
    /* Level 1 teaches no kanji, so it never blocks a WaniKani import: a member
       arriving mid-ladder has plainly met its radicals along the way. */
    if (need === 0) {
      floor = Math.min(level + 1, maxLevel);
      continue;
    }
    if ((passedByLevel.get(level) ?? 0) / need >= 0.9) {
      floor = Math.min(level + 1, maxLevel);
      continue;
    }
    break;
  }

  return {
    states,
    floor,
    summary: { matched: states.length, unmatched, skippedNotHigher, levelsCleared: floor - 1 },
  };
}
