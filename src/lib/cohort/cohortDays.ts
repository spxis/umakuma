import { seededRandom, type RandomSource } from "@/lib/gameRandom";

import type { CohortPersona } from "./cohortPersona";

/**
 * When a simulated member sits down.
 *
 * Every day of a member's life is decided from a random source seeded with
 * their slug and that day, so the answer for a given day never changes
 * between runs. That is what lets `pnpm cohort play` be run whenever it is
 * convenient: it walks every session from the member's last recorded one up
 * to now, and a day it has already passed over comes out exactly as it did
 * the first time, active or not.
 *
 * Days are the member's own, in their own time zone - a Thai student's
 * Saturday is a Saturday in Bangkok - and the session times come back as
 * instants, which is what the SRS and the Vancouver day key both want.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type LocalDay = { year: number; month: number; day: number };

/** The calendar day an instant falls on for this member. */
export function localDayOf(at: Date, utcOffsetHours: number): LocalDay {
  const shifted = new Date(at.getTime() + utcOffsetHours * HOUR_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

export function localDayKey(day: LocalDay): string {
  const month = String(day.month + 1).padStart(2, "0");
  const date = String(day.day).padStart(2, "0");
  return `${day.year}-${month}-${date}`;
}

/** The instant of `hour:minute` on a member's local day. */
export function localInstant(day: LocalDay, hour: number, minute: number, utcOffsetHours: number): Date {
  return new Date(Date.UTC(day.year, day.month, day.day, hour, minute) - utcOffsetHours * HOUR_MS);
}

export function nextLocalDay(day: LocalDay): LocalDay {
  const next = new Date(Date.UTC(day.year, day.month, day.day) + DAY_MS);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth(), day: next.getUTCDate() };
}

function isWeekend(day: LocalDay): boolean {
  const weekday = new Date(Date.UTC(day.year, day.month, day.day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** ISO-week-ish index, for deciding whether a whole week is skipped. */
function weekIndex(day: LocalDay): number {
  return Math.floor((Date.UTC(day.year, day.month, day.day) / DAY_MS + 3) / 7);
}

export type DayPlan = {
  active: boolean;
  /** Session start instants, earliest first. Empty on an inactive day. */
  sessions: Date[];
};

/** Whether this member turns up on this day, and when. Deterministic per (member, day). */
export function planDay(persona: CohortPersona, day: LocalDay): DayPlan {
  const weekRandom = seededRandom(`${persona.slug}:week:${weekIndex(day)}`);
  if (weekRandom() < persona.weekOffRate) return { active: false, sessions: [] };

  const random = seededRandom(`${persona.slug}:${localDayKey(day)}`);
  const rate = isWeekend(day) ? persona.weekendRate : persona.weekdayRate;
  if (random() >= rate) return { active: false, sessions: [] };

  const sessions: Date[] = [];
  persona.sessionHours.forEach((hour, index) => {
    /* The second sitting of a day is the one that gets skipped. */
    if (index > 0 && random() < 0.4) return;
    const minute = Math.floor(random() * 50);
    sessions.push(localInstant(day, hour, minute, persona.utcOffsetHours));
  });
  return { active: sessions.length > 0, sessions };
}

export type PlannedSession = { at: Date; first: boolean };

/**
 * Every session in (`after`, `until`], oldest first.
 *
 * `first` marks the day's first sitting, which is where lessons happen. A
 * member who joined mid-afternoon has no sessions before they joined.
 */
export function sessionsBetween(persona: CohortPersona, after: Date | null, until: Date): PlannedSession[] {
  const floor = after ?? new Date(persona.joinedAt.getTime() - 1);
  const start = new Date(Math.max(floor.getTime(), persona.joinedAt.getTime() - 1));
  const sessions: PlannedSession[] = [];
  let day = localDayOf(start, persona.utcOffsetHours);
  const last = localDayOf(until, persona.utcOffsetHours);

  for (let guard = 0; guard < 2_000; guard += 1) {
    /* A sitting before the member joined never happened, so it cannot be
       the day's first; one already recorded still was, so a later sitting
       on that day is not handed the lessons twice. */
    const theirs = planDay(persona, day).sessions.filter((at) => at >= persona.joinedAt);
    theirs.forEach((at, index) => {
      if (at > start && at <= until) sessions.push({ at, first: index === 0 });
    });
    if (localDayKey(day) === localDayKey(last)) break;
    day = nextLocalDay(day);
  }
  return sessions;
}

/** The random source for what happens inside one session. */
export function sessionRandom(persona: CohortPersona, at: Date): RandomSource {
  return seededRandom(`${persona.slug}:session:${at.toISOString()}`);
}
