import { describe, expect, it } from "vitest";

import { isGameCurrencyType } from "@/lib/gameCurrencyDomain";

import { SHOP_ITEMS } from "./Shop.constants";
import { SHOP_CHARACTERS, isShopCharacter } from "./Shop.types";

describe("the shop catalogue", () => {
  it("has sixteen items", () => {
    expect(SHOP_ITEMS).toHaveLength(16);
  });

  it("splits evenly, eight for Uma and eight for Kuma", () => {
    const uma = SHOP_ITEMS.filter((item) => item.character === SHOP_CHARACTERS.uma);
    const kuma = SHOP_ITEMS.filter((item) => item.character === SHOP_CHARACTERS.kuma);
    expect(uma).toHaveLength(8);
    expect(kuma).toHaveLength(8);
  });

  it("gives every item a unique id", () => {
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices everything as a positive whole number in a real currency", () => {
    for (const item of SHOP_ITEMS) {
      expect(isGameCurrencyType(item.currency), item.id).toBe(true);
      expect(Number.isInteger(item.price), item.id).toBe(true);
      expect(item.price, item.id).toBeGreaterThan(0);
    }
  });

  it("uses a real character for every item", () => {
    for (const item of SHOP_ITEMS) {
      expect(isShopCharacter(item.character), item.id).toBe(true);
    }
  });

  it("shows off all three currencies rather than leaning on one", () => {
    const usedCurrencies = new Set(SHOP_ITEMS.map((item) => item.currency));
    expect(usedCurrencies.size).toBe(3);
  });
});
