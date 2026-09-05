import "server-only";

import { prisma } from "@/lib/prisma";

import { MAX_VACATION_DAYS_AT_ONCE, XP_REST_DAY_ALLOWANCE, XP_VACATION_ALLOWANCE } from "./xpRest";

/**
 * The live time-off rules, which live in the database so they can be tuned.
 *
 * The constants next door are the defaults a fresh environment starts with.
 * These are what the site actually runs on, and they are editable from the
 * admin screen for the same reason the XP prices are: how generous to be is a
 * judgement you get wrong on paper and only learn by watching a member come
 * back from a holiday. A rule that needs a deploy to change is a rule that
 * stays wrong for a fortnight.
 *
 * Stored as one JSON string under a single key rather than a row per tier.
 * The tiers are read together, written together and only ever make sense
 * together — three rows that could be updated separately would be three ways
 * for the ladder to end up non-monotonic.
 */

export const REST_RULES_KEY = "xp_time_off_rules";

export type TimeOffRules = {
  restDays: { rank: number; days: number }[];
  vacationWeeks: { rank: number; weeks: number }[];
  maxVacationDaysAtOnce: number;
};

export const DEFAULT_TIME_OFF_RULES: TimeOffRules = {
  restDays: [...XP_REST_DAY_ALLOWANCE],
  vacationWeeks: [...XP_VACATION_ALLOWANCE],
  maxVacationDaysAtOnce: MAX_VACATION_DAYS_AT_ONCE,
};

/**
 * A stored rule set that has lost its shape reads as the defaults, never as a
 * crash: somebody's holiday should not be cancelled by a malformed setting.
 */
export function parseTimeOffRules(raw: string | null | undefined): TimeOffRules {
  if (!raw) return DEFAULT_TIME_OFF_RULES;
  try {
    const parsed = JSON.parse(raw) as Partial<TimeOffRules>;
    const restDays = Array.isArray(parsed.restDays) ? parsed.restDays : DEFAULT_TIME_OFF_RULES.restDays;
    const vacationWeeks = Array.isArray(parsed.vacationWeeks)
      ? parsed.vacationWeeks
      : DEFAULT_TIME_OFF_RULES.vacationWeeks;
    return {
      /* Sorted by rank on read, because the lookup walks them in order and a
         hand-edited setting is exactly where an out-of-order tier appears. */
      restDays: [...restDays].sort((a, b) => a.rank - b.rank),
      vacationWeeks: [...vacationWeeks].sort((a, b) => a.rank - b.rank),
      maxVacationDaysAtOnce:
        typeof parsed.maxVacationDaysAtOnce === "number" && parsed.maxVacationDaysAtOnce > 0
          ? parsed.maxVacationDaysAtOnce
          : DEFAULT_TIME_OFF_RULES.maxVacationDaysAtOnce,
    };
  } catch {
    return DEFAULT_TIME_OFF_RULES;
  }
}

export async function timeOffRules(): Promise<TimeOffRules> {
  const row = await prisma.siteSetting.findUnique({ where: { key: REST_RULES_KEY }, select: { value: true } });
  return parseTimeOffRules(row?.value);
}

export async function saveTimeOffRules(rules: TimeOffRules): Promise<void> {
  const value = JSON.stringify(rules);
  await prisma.siteSetting.upsert({
    where: { key: REST_RULES_KEY },
    create: { key: REST_RULES_KEY, value },
    update: { value },
  });
}
