import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  checkpointDueAt,
  DEFAULT_STUDY_PREFERENCES,
  orderReviews,
  parseStudyPreferences,
  STUDY_REVIEW_ORDERS,
  STUDY_TEST_INTERVALS,
  matchingPreset,
  STUDY_PRESET_VALUES,
  STUDY_PRESETS,
  suggestedPresetFor,
  throttleAppliesTo,
} from "./studyPreferences";

/**
 * The line: a member may change their experience and their pace, never what a
 * level means. These are the tests that keep it honest.
 */
describe("what a preference may not touch", () => {
  it("has no preference key anywhere in the level gate", () => {
    /* The load-bearing test. If a preference ever needs to reach unLevel.ts,
       it is not a preference - it is a change to what UmaKuma level 40 means,
       and that has to be the same for everybody or the badges, the
       leaderboard and the JLPT milestones stop meaning anything. */
    const gate = readFileSync("src/lib/uk/unLevel.ts", "utf8");
    for (const key of Object.keys(DEFAULT_STUDY_PREFERENCES)) {
      expect(gate, `${key} must not reach the level gate`).not.toContain(key);
    }
    expect(gate).not.toContain("studyPreferences");
  });

  it("keeps the JLPT majors out of the member's hands", () => {
    /* "Level 35" carries the claim that N3 was verified. A member who could
       switch that off would hold a level meaning something different from
       everybody else's. */
    const source = readFileSync("src/lib/srs/studyPreferences.ts", "utf8");
    expect(source).toContain("The **JLPT majors** at levels 10, 20, 35, 50 and");
    expect(source).not.toContain("jlptTestsEnabled");
    /* Turning checkpoints off entirely still leaves the majors alone: this
       function is never asked about one. */
    const off = { ...DEFAULT_STUDY_PREFERENCES, testInterval: 0 as const };
    expect(checkpointDueAt(35, off)).toBe(false);
  });

  it("never drops an item when reordering", () => {
    /* Order is ergonomics. A choice that shortened somebody's queue would be
       a choice that made the ladder easier. */
    const items = Array.from({ length: 20 }, (_, at) => ({
      id: at,
      srsStage: (at % 8) + 1,
      availableAt: at % 5 === 0 ? null : new Date(2026, 8, 1 + at),
    }));
    for (const order of Object.values(STUDY_REVIEW_ORDERS)) {
      const out = orderReviews(items, order, () => 0.42);
      expect(out, order).toHaveLength(items.length);
      expect(new Set(out.map((item) => item.id)), order).toEqual(new Set(items.map((item) => item.id)));
    }
  });
});

describe("the orders themselves", () => {
  const items = [
    { srsStage: 6, availableAt: new Date("2026-09-03") },
    { srsStage: 1, availableAt: new Date("2026-09-01") },
    { srsStage: 3, availableAt: null },
    { srsStage: 2, availableAt: new Date("2026-09-02") },
  ];

  it("puts the most overdue first", () => {
    expect(orderReviews(items, STUDY_REVIEW_ORDERS.overdue)[0].availableAt).toEqual(new Date("2026-09-01"));
  });

  it("sorts an item with no due date last rather than treating it as ancient", () => {
    expect(orderReviews(items, STUDY_REVIEW_ORDERS.overdue).at(-1)?.availableAt).toBeNull();
  });

  it("puts the lowest stage first when asked", () => {
    expect(orderReviews(items, STUDY_REVIEW_ORDERS.lowestStage).map((item) => item.srsStage)).toEqual([1, 2, 3, 6]);
  });
});

describe("pace, which a member may choose", () => {
  it("follows the site unless the member has an opinion", () => {
    const site = DEFAULT_STUDY_PREFERENCES;
    expect(throttleAppliesTo(site, true)).toBe(true);
    expect(throttleAppliesTo(site, false)).toBe(false);
    expect(throttleAppliesTo({ ...site, throttleLessons: "off" }, true)).toBe(false);
    expect(throttleAppliesTo({ ...site, throttleLessons: "on" }, false)).toBe(true);
  });

  it("offers checkpoints at the interval asked for", () => {
    const every = (n: 0 | 1 | 2 | 3 | 5 | 10) => ({ ...DEFAULT_STUDY_PREFERENCES, testInterval: n });
    expect(checkpointDueAt(5, every(5))).toBe(true);
    expect(checkpointDueAt(6, every(5))).toBe(false);
    expect(checkpointDueAt(6, every(1))).toBe(true);
    expect(checkpointDueAt(6, every(0))).toBe(false);
    expect(STUDY_TEST_INTERVALS).toContain(5);
  });
});

describe("preferences that arrive malformed", () => {
  it("reads as the defaults rather than crashing", () => {
    /* Read on the path that builds a review queue. A member who has never
       chosen anything is the common case, not an error. */
    expect(parseStudyPreferences(null)).toEqual(DEFAULT_STUDY_PREFERENCES);
    expect(parseStudyPreferences("{not json")).toEqual(DEFAULT_STUDY_PREFERENCES);
    expect(parseStudyPreferences('{"reviewOrder":"sideways"}').reviewOrder).toBe(STUDY_REVIEW_ORDERS.overdue);
    expect(parseStudyPreferences('{"testInterval":7}').testInterval).toBe(5);
  });

  it("clamps a number out of range rather than rejecting it", () => {
    expect(parseStudyPreferences('{"batchSize":9999}').batchSize).toBe(50);
    expect(parseStudyPreferences('{"batchSize":1}').batchSize).toBe(3);
    expect(parseStudyPreferences('{"dailyLessonCap":-5}').dailyLessonCap).toBe(0);
  });
});

describe("the order actually reaching the member", () => {
  it("walks the ordered queue, not the database's row order", () => {
    /* The bug this pins: the subjects are fetched by id and come back in
       whatever order the database chose, so mapping over *them* threw the
       member's chosen order away and left the reorder as dead code that
       looked like it worked. */
    const queue = readFileSync("src/lib/uk/ukStudyQueue.ts", "utf8");
    expect(queue).toContain("return due.flatMap((state) => {");
    expect(queue).not.toContain("return rows.map((row) => {\n    const state = stateById.get(row.id);");
  });

  it("takes the limit before reordering, so a shuffle changes order and not which items", () => {
    const queue = readFileSync("src/lib/uk/ukStudyQueue.ts", "utf8");
    const fn = queue.slice(queue.indexOf("export async function ukReviews"));
    expect(fn.indexOf("take: limit")).toBeLessThan(fn.indexOf("orderReviews(dueRows"));
  });
});

describe("presets", () => {
  it("are only ever shortcuts to settings a member could pick by hand", () => {
    /* "Gentle" and "intense" sound like difficulty settings and are not: a
       gentle member and an intense one need exactly the same kanji at Guru to
       reach level 40. Every preset must round-trip through the parser
       unchanged, which is what proves it holds no value outside the allowed
       set. */
    for (const [name, values] of Object.entries(STUDY_PRESET_VALUES)) {
      expect(parseStudyPreferences(JSON.stringify(values)), name).toEqual(values);
    }
  });

  it("suggests the gentle one for a child, and never applies it", () => {
    /* A suggestion, not a restriction. A nine-year-old should not meet a
       hundred reviews and a leech warning on their first day - but the kanji
       are the same kanji, and every preset stays pickable by anybody. */
    expect(suggestedPresetFor("under_13")).toBe(STUDY_PRESETS.gentle);
    expect(suggestedPresetFor("13_17")).toBe(STUDY_PRESETS.steady);
    expect(suggestedPresetFor(null)).toBe(STUDY_PRESETS.steady);
    const panel = readFileSync("src/app/users/[nickname]/settings/StudyPreferencesPanel.tsx", "utf8");
    /* Marked with a star, never auto-saved. */
    expect(panel).toContain('preset === suggested ? " ★" : ""');
  });

  it("recognises when a member's settings match one, and when they do not", () => {
    expect(matchingPreset(STUDY_PRESET_VALUES.gentle)).toBe(STUDY_PRESETS.gentle);
    expect(matchingPreset(DEFAULT_STUDY_PREFERENCES)).toBe(STUDY_PRESETS.steady);
    expect(matchingPreset({ ...STUDY_PRESET_VALUES.gentle, batchSize: 7 })).toBeNull();
  });

  it("holds no preset that reaches past the line", () => {
    const gate = readFileSync("src/lib/uk/unLevel.ts", "utf8");
    for (const values of Object.values(STUDY_PRESET_VALUES)) {
      for (const key of Object.keys(values)) {
        expect(gate, `${key} must not reach the level gate`).not.toContain(key);
      }
    }
  });
});

describe("easiest and hardest", () => {
  const items = [
    { subjectId: 1, srsStage: 1, availableAt: new Date("2026-09-01"), correctCount: 1, reviewCount: 9, passedAt: null },
    { subjectId: 2, srsStage: 8, availableAt: new Date("2026-09-02"), correctCount: 9, reviewCount: 9, passedAt: null },
  ];

  it("uses the site's own difficulty score, not a second one", () => {
    /* A member who sorts by difficulty in two places has every right to expect
       the same order, so this reuses reviewEaseScore rather than inventing a
       rival notion of "hard". */
    const source = readFileSync("src/lib/srs/studyPreferences.ts", "utf8");
    expect(source).toContain('from "@/lib/reviewDifficulty"');
    expect(source).toContain("reviewEaseScore(");
  });

  it("puts the well-known item first for easiest, and last for hardest", () => {
    expect(orderReviews(items, STUDY_REVIEW_ORDERS.easiest)[0].subjectId).toBe(2);
    expect(orderReviews(items, STUDY_REVIEW_ORDERS.hardest)[0].subjectId).toBe(1);
  });
});
