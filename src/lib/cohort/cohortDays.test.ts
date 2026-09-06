import { describe, expect, it } from "vitest";

import { localDayKey, localDayOf, localInstant, planDay, sessionsBetween } from "./cohortDays";
import { derivePersona, type CohortPersona } from "./cohortPersona";

const JOINED = new Date("2026-08-01T12:00:00Z");

function persona(slug: string, country: "VN" | "CA" | "AU" = "VN"): CohortPersona {
  return derivePersona({ slug, displayName: slug, country, joinedAt: JOINED });
}

describe("local days", () => {
  it("places an instant on the member's own calendar day", () => {
    /* 23:30 UTC on the 5th is already the 6th in Vietnam and still the 5th in Vancouver. */
    const at = new Date("2026-09-05T23:30:00Z");
    expect(localDayKey(localDayOf(at, 7))).toBe("2026-09-06");
    expect(localDayKey(localDayOf(at, -7))).toBe("2026-09-05");
  });

  it("turns a local hour back into the right instant", () => {
    const day = { year: 2026, month: 8, day: 6 };
    expect(localInstant(day, 21, 0, 7).toISOString()).toBe("2026-09-06T14:00:00.000Z");
    expect(localInstant(day, 21, 0, -7).toISOString()).toBe("2026-09-07T04:00:00.000Z");
  });
});

describe("planDay", () => {
  it("answers the same way every time it is asked about a day", () => {
    const member = persona("ploy-r", "VN");
    const day = { year: 2026, month: 8, day: 4 };
    expect(planDay(member, day)).toEqual(planDay(member, day));
  });

  it("has a daily member turning up most days and a drifter far fewer", () => {
    const rate = (member: CohortPersona) => {
      let active = 0;
      for (let offset = 0; offset < 120; offset += 1) {
        const at = new Date(JOINED.getTime() + offset * 86_400_000);
        if (planDay(member, localDayOf(at, member.utcOffsetHours)).active) active += 1;
      }
      return active / 120;
    };
    const personas = Array.from({ length: 60 }, (_, i) => persona(`p-${i}`));
    const daily = personas.filter((p) => p.archetype === "daily");
    const drifters = personas.filter((p) => p.archetype === "drifter");
    expect(daily.length).toBeGreaterThan(0);
    expect(drifters.length).toBeGreaterThan(0);
    const dailyRate = daily.reduce((s, p) => s + rate(p), 0) / daily.length;
    const drifterRate = drifters.reduce((s, p) => s + rate(p), 0) / drifters.length;
    expect(dailyRate).toBeGreaterThan(0.8);
    expect(drifterRate).toBeLessThan(0.45);
  });

  it("starts sessions at the member's own hours, in order", () => {
    const member = persona("session-hours", "AU");
    for (let offset = 0; offset < 30; offset += 1) {
      const day = localDayOf(new Date(JOINED.getTime() + offset * 86_400_000), member.utcOffsetHours);
      const plan = planDay(member, day);
      const hours = plan.sessions.map((at) => localDayOf(at, 0) && new Date(at.getTime() + member.utcOffsetHours * 3_600_000).getUTCHours());
      for (const hour of hours) expect(member.sessionHours).toContain(hour);
      expect([...hours].sort((a, b) => a - b)).toEqual(hours);
    }
  });
});

describe("sessionsBetween", () => {
  it("never replays a session at or before the last recorded one, and never one before the join", () => {
    const member = persona("carry-on", "CA");
    const until = new Date("2026-09-06T18:00:00Z");
    const all = sessionsBetween(member, null, until);
    expect(all.length).toBeGreaterThan(5);
    for (const session of all) {
      expect(session.at.getTime()).toBeGreaterThanOrEqual(JOINED.getTime());
      expect(session.at.getTime()).toBeLessThanOrEqual(until.getTime());
    }
    const midway = all[Math.floor(all.length / 2)]!.at;
    const rest = sessionsBetween(member, midway, until);
    expect(rest).toEqual(all.filter((session) => session.at > midway));
  });

  it("marks the first sitting of each day and no other", () => {
    const member = persona("first-marks", "VN");
    const sessions = sessionsBetween(member, null, new Date("2026-09-06T18:00:00Z"));
    const byDay = new Map<string, number>();
    for (const session of sessions) {
      const key = localDayKey(localDayOf(session.at, member.utcOffsetHours));
      const seen = byDay.get(key) ?? 0;
      expect(session.first).toBe(seen === 0);
      byDay.set(key, seen + 1);
    }
  });
});
