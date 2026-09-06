import { describe, expect, it } from "vitest";

import {
  GAME_CURRENCY_DISPLAY,
  GAME_CURRENCY_TYPES,
  GAME_CURRENCY_VALUES,
  isGameCurrencyType,
  pickRandomGameCurrency,
} from "./gameCurrencyDomain";

describe("the three currencies", () => {
  it("has exactly mochi, oni and kane", () => {
    expect(GAME_CURRENCY_VALUES).toEqual([
      GAME_CURRENCY_TYPES.mochi,
      GAME_CURRENCY_TYPES.oni,
      GAME_CURRENCY_TYPES.kane,
    ]);
  });

  it("has display info for every currency, and only those", () => {
    expect(Object.keys(GAME_CURRENCY_DISPLAY).sort()).toEqual([...GAME_CURRENCY_VALUES].sort());
  });

  it("sums drop weights to 100, so a random pick always lands", () => {
    const total = GAME_CURRENCY_VALUES.reduce((sum, type) => sum + GAME_CURRENCY_DISPLAY[type].dropWeight, 0);
    expect(total).toBe(100);
  });

  it("makes the rarer currency worth more per unit", () => {
    const { mochi, oni, kane } = GAME_CURRENCY_DISPLAY;
    expect(mochi.dropWeight).toBeGreaterThan(oni.dropWeight);
    expect(oni.dropWeight).toBeGreaterThan(kane.dropWeight);
    expect(mochi.perUnitValue).toBeLessThan(oni.perUnitValue);
    expect(oni.perUnitValue).toBeLessThan(kane.perUnitValue);
  });
});

describe("isGameCurrencyType", () => {
  it("accepts the three canonical ids", () => {
    for (const type of GAME_CURRENCY_VALUES) {
      expect(isGameCurrencyType(type)).toBe(true);
    }
  });

  it("rejects anything else, including null and undefined", () => {
    expect(isGameCurrencyType("gem")).toBe(false);
    expect(isGameCurrencyType(null)).toBe(false);
    expect(isGameCurrencyType(undefined)).toBe(false);
  });
});

describe("pickRandomGameCurrency", () => {
  it("picks mochi for a low roll, oni for a mid roll, kane for a high roll", () => {
    expect(pickRandomGameCurrency(() => 0)).toBe(GAME_CURRENCY_TYPES.mochi);
    expect(pickRandomGameCurrency(() => 0.59)).toBe(GAME_CURRENCY_TYPES.mochi);
    expect(pickRandomGameCurrency(() => 0.61)).toBe(GAME_CURRENCY_TYPES.oni);
    expect(pickRandomGameCurrency(() => 0.89)).toBe(GAME_CURRENCY_TYPES.oni);
    expect(pickRandomGameCurrency(() => 0.91)).toBe(GAME_CURRENCY_TYPES.kane);
    expect(pickRandomGameCurrency(() => 0.999999)).toBe(GAME_CURRENCY_TYPES.kane);
  });
});
