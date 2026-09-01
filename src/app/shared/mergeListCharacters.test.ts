import { describe, expect, it } from "vitest";

import { countNewCharacters, mergeListCharacters } from "./mergeListCharacters";

describe("mergeListCharacters", () => {
  /*
   * The failure worth guarding: sending only the new characters would replace
   * the list rather than add to it, emptying weeks of work in one click.
   */
  it("keeps what the list already held", () => {
    expect(mergeListCharacters("水火", ["空"])).toBe("水火空");
  });

  it("adds nothing twice, wherever the repeat came from", () => {
    expect(mergeListCharacters("水火", ["火", "空", "空"])).toBe("水火空");
  });

  it("keeps the order the list had, then the order they were chosen", () => {
    expect(mergeListCharacters("水火", ["月", "日"])).toBe("水火月日");
  });

  it("handles an empty list and an empty selection", () => {
    expect(mergeListCharacters("", ["水"])).toBe("水");
    expect(mergeListCharacters("水", [])).toBe("水");
    expect(mergeListCharacters("", [])).toBe("");
  });
});

describe("countNewCharacters", () => {
  it("counts only what the list does not already hold", () => {
    expect(countNewCharacters("水火", ["火", "空"])).toBe(1);
    expect(countNewCharacters("水火", ["水", "火"])).toBe(0);
    expect(countNewCharacters("", ["水", "火"])).toBe(2);
  });

  it("counts a repeated choice once", () => {
    expect(countNewCharacters("", ["水", "水"])).toBe(1);
  });
});
