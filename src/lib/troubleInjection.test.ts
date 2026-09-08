import { describe, expect, it } from "vitest";

import { interleaveInjected, troubleInjectionCount } from "./troubleInjection";

describe("how many trouble items join a sitting", () => {
  it("is a quarter of the reviews, capped at twenty and at what is available", () => {
    expect(troubleInjectionCount(40, 100)).toBe(10);
    expect(troubleInjectionCount(200, 100)).toBe(20);
    expect(troubleInjectionCount(40, 3)).toBe(3);
    expect(troubleInjectionCount(40, 0)).toBe(0);
  });

  it("offers up to ten when there is nothing due at all", () => {
    expect(troubleInjectionCount(0, 4)).toBe(4);
    expect(troubleInjectionCount(0, 30)).toBe(10);
  });
});

describe("where they go", () => {
  it("spaces them through the reviews and never drops one", () => {
    const merged = interleaveInjected(["r1", "r2", "r3", "r4", "r5", "r6"], ["t1", "t2"]);
    expect(merged).toEqual(["r1", "r2", "r3", "t1", "r4", "r5", "r6", "t2"]);
  });

  it("never bunches them closer than every third review", () => {
    const merged = interleaveInjected(["r1", "r2", "r3", "r4"], ["t1", "t2", "t3"]);
    expect(merged).toEqual(["r1", "r2", "r3", "t1", "r4", "t2", "t3"]);
  });

  it("is the reviews alone, or the trouble alone, when the other is empty", () => {
    expect(interleaveInjected(["r1"], [])).toEqual(["r1"]);
    expect(interleaveInjected([], ["t1"])).toEqual(["t1"]);
  });
});
