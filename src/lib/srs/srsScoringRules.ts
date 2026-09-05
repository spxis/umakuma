import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The scoring rules, live.
 *
 * `docs/SRS_MECHANISMS.md` lists what every other system does about a
 * struggling learner and what we do about each. This is where the ones we have
 * built get switched on, and where their numbers are set — without a deploy,
 * because how hard a scheduler should be is exactly the judgement that is
 * wrong on paper and only learned by watching somebody use it.
 *
 * One JSON row rather than a row per knob, for the same reason `timeOffRules`
 * is one row: these are read together, written together, and only make sense
 * together. A leech threshold without the switch that enables it is two
 * settings that can disagree.
 *
 * **Every rule here is off by default.** A scheduler that changes behaviour
 * the moment it is deployed is a scheduler nobody can reason about. Each one
 * ships dark, gets turned on deliberately, and can be turned off again the
 * moment it feels wrong.
 */

export const SRS_RULES_KEY = "srs_scoring_rules";

export type SrsScoringRules = {
  /**
   * Take no lessons on a day that opens already behind on reviews.
   *
   * Anki does this by default and it is the highest value-for-nothing change
   * the balance simulator found: average backlog down 85% for 0.8% of
   * progress. It costs single-sitting learners most, because they open behind
   * more often.
   */
  throttleLessonsOnBacklog: boolean;
  /** Reviews outstanding at the start of a day before lessons are held back. */
  backlogThreshold: number;

  /**
   * Flag an item that keeps failing instead of letting it grind.
   *
   * WaniKani is the only system surveyed without one. The threshold is a
   * count of wrong answers on a single item; SuperMemo's refinement, which is
   * why `leechMinStage` exists, is that an item which has climbed well should
   * stop counting as a leech regardless of its history.
   */
  leechRule: boolean;
  leechWrongThreshold: number;
  /** An item at or above this stage is not a leech, whatever its history. */
  leechMinStage: number;

  /**
   * A missed item gets its own short track while the main schedule advances.
   *
   * Bunpro's ghost reviews. Not implemented yet — the switch exists so the
   * mechanisms log has somewhere to point, and turning it on does nothing
   * until it does.
   */
  ghostReviews: boolean;
};

export const DEFAULT_SRS_SCORING_RULES: SrsScoringRules = {
  throttleLessonsOnBacklog: false,
  backlogThreshold: 100,
  leechRule: false,
  leechWrongThreshold: 8,
  leechMinStage: 5,
  ghostReviews: false,
};

const NUMERIC_BOUNDS: Record<string, { min: number; max: number }> = {
  backlogThreshold: { min: 10, max: 2_000 },
  leechWrongThreshold: { min: 3, max: 50 },
  leechMinStage: { min: 1, max: 9 },
};

/** Clamped rather than rejected: a stored number out of range must not stop a review. */
function boundedNumber(key: string, value: unknown, fallback: number): number {
  const bounds = NUMERIC_BOUNDS[key];
  if (typeof value !== "number" || !Number.isFinite(value) || !bounds) return fallback;
  return Math.min(Math.max(Math.trunc(value), bounds.min), bounds.max);
}

/**
 * A stored rule set that has lost its shape reads as the defaults, never as a
 * crash. These are read on the path that answers a review; a malformed row
 * must not be able to stop somebody studying.
 */
export function parseSrsScoringRules(raw: string | null | undefined): SrsScoringRules {
  if (!raw) return DEFAULT_SRS_SCORING_RULES;
  try {
    const parsed = JSON.parse(raw) as Partial<SrsScoringRules>;
    const bool = (key: keyof SrsScoringRules) =>
      typeof parsed[key] === "boolean" ? (parsed[key] as boolean) : (DEFAULT_SRS_SCORING_RULES[key] as boolean);
    return {
      throttleLessonsOnBacklog: bool("throttleLessonsOnBacklog"),
      backlogThreshold: boundedNumber("backlogThreshold", parsed.backlogThreshold, DEFAULT_SRS_SCORING_RULES.backlogThreshold),
      leechRule: bool("leechRule"),
      leechWrongThreshold: boundedNumber("leechWrongThreshold", parsed.leechWrongThreshold, DEFAULT_SRS_SCORING_RULES.leechWrongThreshold),
      leechMinStage: boundedNumber("leechMinStage", parsed.leechMinStage, DEFAULT_SRS_SCORING_RULES.leechMinStage),
      ghostReviews: bool("ghostReviews"),
    };
  } catch {
    return DEFAULT_SRS_SCORING_RULES;
  }
}

export async function srsScoringRules(): Promise<SrsScoringRules> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SRS_RULES_KEY }, select: { value: true } });
  return parseSrsScoringRules(row?.value);
}

export async function saveSrsScoringRules(rules: SrsScoringRules): Promise<SrsScoringRules> {
  /* Round-tripped through the parser so a value written by a hand-edited
     request is bounded on the way in, not only on the way out. */
  const safe = parseSrsScoringRules(JSON.stringify(rules));
  const value = JSON.stringify(safe);
  await prisma.siteSetting.upsert({
    where: { key: SRS_RULES_KEY },
    create: { key: SRS_RULES_KEY, value },
    update: { value },
  });
  return safe;
}

/** Whether an item's record makes it a leech under the current rules. */
export function isLeech(
  item: { wrongCount: number; srsStage: number },
  rules: SrsScoringRules,
): boolean {
  if (!rules.leechRule) return false;
  /* An item that has climbed is not a leech however badly it started -
     SuperMemo's rule, and the reason the threshold alone is not enough. */
  if (item.srsStage >= rules.leechMinStage) return false;
  return item.wrongCount >= rules.leechWrongThreshold;
}
