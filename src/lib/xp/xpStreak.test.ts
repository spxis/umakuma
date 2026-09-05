import { describe, expect, it } from "vitest";

import { summariseXpActivity } from "./xpActivity";
import { resolveStreak, streakMilestoneReached } from "./xpStreak";

const day = (n: number) => new Date(Date.UTC(2026, 8, n)).toISOString().slice(0, 10);

describe("a streak, derived from the days that exist", () => {
  it("counts consecutive days up to today", () => {
    expect(resolveStreak([day(1), day(2), day(3)], day(3)).current).toBe(3);
  });

  it("does not break a streak just because today is not over", () => {
    /* Telling somebody at breakfast that they have lost a hundred days
       because they have not studied *yet* would be wrong, and the cruellest
       possible moment to say it. */
    const standing = resolveStreak([day(1), day(2), day(3)], day(4));
    expect(standing.current).toBe(3);
    expect(standing.activeToday).toBe(false);
  });

  it("breaks when a whole day passes with nothing in it", () => {
    expect(resolveStreak([day(1), day(2), day(3)], day(5)).current).toBe(0);
  });

  it("remembers the longest run even after it ends", () => {
    const standing = resolveStreak([day(1), day(2), day(3), day(4), day(9)], day(9));
    expect(standing.current).toBe(1);
    expect(standing.longest).toBe(4);
  });

  it("has nothing to say about a member who has never appeared", () => {
    expect(resolveStreak([], day(3))).toEqual({
      current: 0,
      longest: 0,
      lastActiveDay: null,
      activeToday: false,
    });
  });

  it("fires a milestone on the day it is reached and not after", () => {
    /* Exact, not at-least: the award is for becoming thirty days, not for
       being past it. The once-per-day key is a second guard, not the only one. */
    const milestones = [{ days: 7, kind: "sevenDayStreak" }, { days: 30, kind: "thirtyDayStreak" }];
    expect(streakMilestoneReached(7, milestones)?.kind).toBe("sevenDayStreak");
    expect(streakMilestoneReached(8, milestones)).toBeNull();
    expect(streakMilestoneReached(30, milestones)?.kind).toBe("thirtyDayStreak");
  });
});

describe("what the XP history says about a member", () => {
  const rows = [
    { dayKey: day(1), kind: "reviewAnswered", amount: 40 },
    { dayKey: day(1), kind: "gameFinished", amount: 10 },
    { dayKey: day(2), kind: "reviewAnswered", amount: 60 },
    { dayKey: day(3), kind: "gameFinished", amount: 10 },
  ];

  it("says what they are actually here for", () => {
    const activity = summariseXpActivity(rows, day(3));
    expect(activity.byKind[0]).toMatchObject({ kind: "reviewAnswered", amount: 100 });
    expect(activity.byKind[0].share).toBeCloseTo(100 / 120);
  });

  it("averages over active days, so a fortnight away does not flatten it", () => {
    expect(summariseXpActivity(rows, day(20)).averagePerActiveDay).toBe(40);
  });

  it("says how long somebody has been gone", () => {
    /* The one worth knowing on a family site: a member two weeks quiet is
       something to notice before they are gone for good. */
    expect(summariseXpActivity(rows, day(17)).daysSinceLastActive).toBe(14);
    expect(summariseXpActivity([], day(17)).daysSinceLastActive).toBeNull();
  });

  it("finds the busiest day, for a sense of what a full session looks like", () => {
    expect(summariseXpActivity(rows, day(3)).bestDay).toEqual({ dayKey: day(2), amount: 60 });
  });
});

describe("days off", () => {
  it("holds a streak across a protected day", () => {
    /* The whole point: nobody loses a hundred days because they had flu on a
       Tuesday. */
    expect(resolveStreak([day(1), day(2), day(4)], day(4)).current).toBe(1);
    expect(resolveStreak([day(1), day(2), day(4)], day(4), [day(3)]).current).toBe(4);
  });

  it("holds it across a whole vacation", () => {
    const away = [day(3), day(4), day(5), day(6), day(7), day(8), day(9)];
    expect(resolveStreak([day(1), day(2), day(10)], day(10), away).current).toBe(10);
  });

  it("does not pretend a protected day was a day of study", () => {
    /* A rest day keeps the streak and claims nothing else: it is not activity,
       and telling somebody they have studied today when they have not is the
       one thing a streak must never do. */
    const standing = resolveStreak([day(1), day(2)], day(3), [day(3)]);
    expect(standing.current).toBe(3);
    expect(standing.activeToday).toBe(false);
    expect(standing.lastActiveDay).toBe(day(2));
  });

  it("still breaks when the days off run out", () => {
    /* An allowance that never runs out is not an allowance. */
    expect(resolveStreak([day(1), day(2)], day(8), [day(3)]).current).toBe(0);
  });
});
