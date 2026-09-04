import { describe, expect, it } from "vitest";

import {
  cleanSessionUnits,
  isXpBonusKind,
  jlptMilestoneFor,
  streakMilestoneFor,
  XP_AWARDS,
  XP_BONUSES,
  XP_CLEAN_SESSION_MIN,
  XP_DAILY_CAPS,
  XP_STREAK_MILESTONES,
  XP_TYPE_NOTES,
  xpAwardValue,
} from "./xpAwards";

/**
 * The economy, held to the rules it was written under.
 *
 * Two of these are John's and are not negotiable by a later edit: every value
 * ends in a five or a zero, and a bonus is a garnish rather than a second
 * economy. The third is the one a change is most likely to break quietly - the
 * clean-session bonus has to grow faster than the batch, or it becomes an
 * instruction to review one item at a time.
 */
describe("what XP is worth", () => {
  const everything = { ...XP_AWARDS, ...XP_BONUSES };

  it("prices every bonus in fives", () => {
    /* John's rule, the same one the rank costs follow: a bonus of 37 next to a
       rank costing 4,310 reads as something a machine produced. The routine
       awards are exempt because they are counted in ones - a review is worth
       1, and rounding that to 5 would move the whole economy. */
    for (const [kind, value] of Object.entries(XP_BONUSES)) {
      expect(value % 5, `${kind} is ${value}`).toBe(0);
    }
  });

  it("keeps the routine map and the bonus map apart", () => {
    for (const kind of Object.keys(XP_AWARDS)) {
      expect(kind in XP_BONUSES, kind).toBe(false);
    }
    expect(isXpBonusKind("burnedItem")).toBe(true);
    expect(isXpBonusKind("reviewAnswered")).toBe(false);
  });

  it("explains every kind to the member who earned it", () => {
    /* The seeder writes these into XpType, so a missing one is a blank cell on
       somebody's history rather than a crash anybody would notice. */
    for (const kind of Object.keys(everything)) {
      const note = XP_TYPE_NOTES[kind];
      expect(note, kind).toBeTruthy();
      expect(note.trim().endsWith("."), `${kind}: ${note}`).toBe(true);
    }
    expect(Object.keys(XP_TYPE_NOTES).sort()).toEqual(Object.keys(everything).sort());
  });

  it("escalates the streak milestones", () => {
    const days = XP_STREAK_MILESTONES.map((milestone) => milestone.days);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    const values = XP_STREAK_MILESTONES.map((milestone) => XP_BONUSES[milestone.kind]);
    for (let at = 1; at < values.length; at += 1) {
      expect(values[at]).toBeGreaterThan(values[at - 1]);
    }
    expect(streakMilestoneFor(30)).toBe("thirtyDayStreak");
    /* A milestone is the day it lands on, not every day past it. */
    expect(streakMilestoneFor(31)).toBeNull();
    expect(streakMilestoneFor(0)).toBeNull();
  });

  it("makes each JLPT band worth more than the one below it", () => {
    const bands = [5, 4, 3, 2, 1].map((n) => XP_BONUSES[jlptMilestoneFor(n)!]);
    for (let at = 1; at < bands.length; at += 1) {
      expect(bands[at]).toBeGreaterThan(bands[at - 1]);
    }
    expect(jlptMilestoneFor(null)).toBeNull();
    expect(jlptMilestoneFor(6)).toBeNull();
  });

  it("keeps the biggest bonus below the cost of a top rank", () => {
    /* A bonus that buys a whole rank at the hard end of the ladder is not a
       bonus, it is a shortcut past the thing being measured. */
    const biggest = Math.max(...Object.values(XP_BONUSES));
    expect(biggest).toBeLessThan(4310);
  });
});

describe("the clean-session bonus", () => {
  it("pays nothing for a batch too small to be a session", () => {
    for (let size = 0; size < XP_CLEAN_SESSION_MIN; size += 1) {
      expect(cleanSessionUnits(size), `${size} items`).toBe(0);
    }
    expect(cleanSessionUnits(XP_CLEAN_SESSION_MIN)).toBeGreaterThan(0);
  });

  it("is worth more per item as the batch grows", () => {
    /* The exploit it exists to close: ten out of ten has to beat two out of
       two, and beat ten separate sittings of one. */
    expect(cleanSessionUnits(2)).toBe(0);
    expect(cleanSessionUnits(10)).toBeGreaterThan(cleanSessionUnits(2) * 5);
    expect(cleanSessionUnits(20)).toBeGreaterThan(cleanSessionUnits(10) * 2);
    expect(cleanSessionUnits(40)).toBeGreaterThan(cleanSessionUnits(20) * 2);
  });

  it("never goes backwards as the batch grows", () => {
    for (let size = 1; size < 200; size += 1) {
      expect(cleanSessionUnits(size), `${size} items`).toBeGreaterThanOrEqual(cleanSessionUnits(size - 1));
    }
  });

  it("survives nonsense rather than returning one", () => {
    expect(cleanSessionUnits(Number.NaN)).toBe(0);
    expect(cleanSessionUnits(Number.POSITIVE_INFINITY)).toBe(0);
    expect(cleanSessionUnits(-4)).toBe(0);
  });
});

describe("the daily caps", () => {
  it("stops paying once a cap is full, and never pays a negative", () => {
    const cap = XP_DAILY_CAPS.burnedItem!;
    expect(xpAwardValue("burnedItem", 0)).toBe(XP_BONUSES.burnedItem);
    expect(xpAwardValue("burnedItem", cap)).toBe(0);
    expect(xpAwardValue("burnedItem", cap + 100)).toBe(0);
  });

  it("pays the part of an award that still fits under the cap", () => {
    const cap = XP_DAILY_CAPS.cleanSession!;
    expect(xpAwardValue("cleanSession", cap - 2)).toBe(2);
  });

  it("leaves reviews uncapped, because capping study says the work stopped counting", () => {
    expect(XP_DAILY_CAPS.reviewAnswered).toBeUndefined();
    expect(xpAwardValue("reviewAnswered", 10_000)).toBe(XP_AWARDS.reviewAnswered);
  });
});
