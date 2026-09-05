import type { ImportVerdict } from "@/lib/xp/simImport";
import type { SimTableRow } from "@/lib/xp/simTable";
import type { SimOverrides, SimPersona } from "@/lib/xp/simTypes";

/** What the panel sends, what it gets back, and what its controls hold. */

export type BalanceRunRequest = {
  personaId: string | null;
  days: number;
  seed: number;
  lessonGate: number | null;
  throttleLessonsOnBacklog: boolean;
  compareSittings: boolean;
  overrides?: SimOverrides;
};

export type BalanceRunResponse = {
  rows: SimTableRow[];
  sittings: SimTableRow[] | null;
  imports: ImportVerdict[];
  days: number;
  error?: string;
};

/**
 * The persona's own settings as text, because they are typed into fields.
 *
 * Held as strings rather than numbers so a half-typed value is a half-typed
 * value rather than a NaN the simulation has to defend itself against. They
 * are parsed once, on the way out.
 */
export type PersonaDraft = {
  attendance: string;
  reviewsPerDay: string;
  lessonsPerDay: string;
  gamesPerDay: string;
  accuracy: string;
  sessionHours: string;
  holidayDays: string;
  startLevel: string;
  sitsExams: boolean;
};

export function draftFromPersona(persona: SimPersona): PersonaDraft {
  return {
    attendance: String(persona.attendance),
    reviewsPerDay: String(persona.reviewsPerDay),
    lessonsPerDay: String(persona.lessonsPerDay),
    gamesPerDay: String(persona.gamesPerDay),
    accuracy: String(persona.accuracy),
    sessionHours: persona.sessionHours.join(", "),
    holidayDays: String(persona.holidayDays),
    startLevel: String(persona.startLevel),
    sitsExams: persona.sitsExams,
  };
}

/**
 * A blank box means "leave it alone", not zero.
 *
 * `Number("")` is 0 and `Number("  ")` is 0, so without this an emptied
 * accuracy field asks for a learner who is wrong every time, and an emptied
 * sittings field asks for somebody who studies at midnight. Both parse, both
 * run, and neither is what anybody typed.
 */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Only the fields that were actually moved, so the persona's own values stand. */
export function overridesFromDraft(draft: PersonaDraft, persona: SimPersona): SimOverrides {
  const hours = draft.sessionHours
    .split(",")
    .map((part) => toNumber(part))
    .filter((hour): hour is number => hour !== undefined && Number.isInteger(hour) && hour >= 0 && hour <= 23);
  const overrides: SimOverrides = {
    attendance: toNumber(draft.attendance),
    reviewsPerDay: toNumber(draft.reviewsPerDay),
    lessonsPerDay: toNumber(draft.lessonsPerDay),
    gamesPerDay: toNumber(draft.gamesPerDay),
    accuracy: toNumber(draft.accuracy),
    holidayDays: toNumber(draft.holidayDays),
    startLevel: toNumber(draft.startLevel),
    sitsExams: draft.sitsExams,
    sessionHours: hours.length > 0 ? hours : persona.sessionHours,
  };
  for (const key of Object.keys(overrides) as (keyof SimOverrides)[]) {
    if (overrides[key] === undefined) delete overrides[key];
  }
  return overrides;
}
