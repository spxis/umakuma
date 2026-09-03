import { describe, expect, it } from "vitest";

import { stepStroke } from "./strokeSteps";

/*
 * Following a character stroke by stroke meant finding a different number to
 * press each time, and on a long character hunting through a wrapped block of
 * them. One repeated press should walk the whole thing.
 */
describe("stepStroke", () => {
  it("moves to the next stroke", () => {
    expect(stepStroke(1, 4, 1)).toBe(2);
    expect(stepStroke(3, 4, 1)).toBe(4);
  });

  it("moves to the previous stroke", () => {
    expect(stepStroke(3, 4, -1)).toBe(2);
    expect(stepStroke(2, 4, -1)).toBe(1);
  });

  /*
   * The ends join up. A control that goes dead on the last stroke sends the
   * reader back to hunt for "1", which is what this removes.
   */
  it("comes round to the first stroke after the last", () => {
    expect(stepStroke(4, 4, 1)).toBe(1);
  });

  it("comes round to the last stroke before the first", () => {
    expect(stepStroke(1, 4, -1)).toBe(4);
  });

  /* -1 % n is negative in JavaScript, which is the trap this guards. */
  it("never returns zero or a negative stroke", () => {
    for (let count = 1; count <= 30; count += 1) {
      for (let current = 1; current <= count; current += 1) {
        for (const direction of [1, -1] as const) {
          const next = stepStroke(current, count, direction);
          expect(next, `${current}/${count} ${direction}`).toBeGreaterThanOrEqual(1);
          expect(next, `${current}/${count} ${direction}`).toBeLessThanOrEqual(count);
        }
      }
    }
  });

  it("stays put on a one-stroke character", () => {
    expect(stepStroke(1, 1, 1)).toBe(1);
    expect(stepStroke(1, 1, -1)).toBe(1);
  });

  /* A character whose stroke data never arrived has no strokes to step. */
  it("answers the first stroke when there are none", () => {
    expect(stepStroke(1, 0, 1)).toBe(1);
    expect(stepStroke(1, -3, -1)).toBe(1);
  });
});
