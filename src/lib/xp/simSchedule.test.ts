import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";

import {
  expectedReviews,
  expectedReviewsToGuru,
  SimDueQueue,
  SRS_DEMOTION,
  SRS_GURU_STAGE,
  SRS_STAGE_HOURS,
  standingReviewLoad,
} from "./simSchedule";
import type { SimItem } from "./simTypes";

function item(level = 1): SimItem {
  return { stage: 1, kind: SUBJECT_TYPES.kanji, level, passed: false };
}

describe("expectedReviews", () => {
  it("costs more the worse you are, at every stage of the climb", () => {
    const sharp = expectedReviewsToGuru(0.92);
    const struggling = expectedReviewsToGuru(0.65);
    expect(sharp).toBeGreaterThan(4);
    expect(struggling).toBeGreaterThan(sharp * 2);
  });

  it("costs more to burn than to reach Guru, because Guru is not the end", () => {
    for (const accuracy of [0.65, 0.8, 0.92]) {
      expect(expectedReviews(accuracy)).toBeGreaterThan(expectedReviewsToGuru(accuracy) * 1.8);
    }
  });

  it("falls monotonically as accuracy rises", () => {
    const costs = [0.6, 0.7, 0.8, 0.9, 0.95].map((accuracy) => expectedReviews(accuracy));
    for (let at = 1; at < costs.length; at += 1) expect(costs[at]).toBeLessThan(costs[at - 1]);
  });

  it("prices a lesson rate against a review budget", () => {
    /* Ten lessons a day at 85% is about 111 reviews a day of standing load,
       which is what makes a fifty-review budget a promise that cannot be kept. */
    expect(standingReviewLoad(10, 0.85)).toBeGreaterThan(100);
    expect(standingReviewLoad(0, 0.85)).toBe(0);
  });
});

describe("the demotion map", () => {
  it("never sends an item below the first stage", () => {
    for (const stage of Object.keys(SRS_DEMOTION)) {
      expect(SRS_DEMOTION[Number(stage)]).toBeGreaterThanOrEqual(0);
      expect(SRS_DEMOTION[Number(stage)]).toBeLessThanOrEqual(Number(stage));
    }
  });

  it("keeps the two short intervals short and the Guru wait long", () => {
    expect(SRS_STAGE_HOURS[1]).toBe(4);
    expect(SRS_STAGE_HOURS[2]).toBe(8);
    /* The ceiling on what a second sitting can buy: stages three and four are
       already longer than a day, so no number of sittings compresses them. */
    expect(SRS_STAGE_HOURS[3]).toBeGreaterThan(12);
    expect(SRS_STAGE_HOURS[SRS_GURU_STAGE]).toBe(168);
  });
});

describe("SimDueQueue", () => {
  it("serves the most overdue first, not the first learned", () => {
    const queue = new SimDueQueue(100);
    const late = item(1);
    const recent = item(2);
    queue.schedule(recent, 40);
    queue.schedule(late, 10);
    expect(queue.take(50, 1)).toEqual([late]);
  });

  it("holds what a sitting could not reach, for the next sitting", () => {
    const queue = new SimDueQueue(100);
    for (let at = 0; at < 5; at += 1) queue.schedule(item(), at);
    expect(queue.take(10, 2)).toHaveLength(2);
    expect(queue.waiting).toBe(3);
    expect(queue.take(10, 10)).toHaveLength(3);
    expect(queue.waiting).toBe(0);
  });

  it("counts what is still in circulation, due or not", () => {
    const queue = new SimDueQueue(100);
    queue.schedule(item(), 5);
    queue.schedule(item(), 90);
    expect(queue.inFlight).toBe(2);
    queue.take(10, 10);
    expect(queue.inFlight).toBe(1);
  });

  it("drops what falls past the horizon, rather than counting work never done", () => {
    const queue = new SimDueQueue(48);
    queue.schedule(item(), 200);
    expect(queue.inFlight).toBe(0);
  });
});
