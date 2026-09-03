import { describe, expect, it } from "vitest";

import { readSheetOptions } from "./sheetOptions";
import {
  SHEET_PREFERENCE_KEYS,
  readSheetPreferences,
  rememberSheetPreference,
  serialiseSheetPreferences,
} from "./sheetPreferences";

describe("the sheet's remembered options", () => {
  it("reads back what it wrote", () => {
    const value = serialiseSheetPreferences({ readings: "1", size: "small" });
    expect(readSheetPreferences(value)).toEqual({ readings: "1", size: "small" });
  });

  it("holds nothing for a browser that has chosen nothing", () => {
    expect(readSheetPreferences(undefined)).toEqual({});
    expect(readSheetPreferences("")).toEqual({});
  });

  /* Anything else in the cookie is not a setting this sheet has. */
  it("ignores keys it does not know", () => {
    expect(readSheetPreferences("readings=1&picked=%E7%B5%B1&mode=strokes")).toEqual({ readings: "1" });
  });

  it("merges a new choice over the old ones", () => {
    const before = serialiseSheetPreferences({ readings: "1", size: "small" });
    expect(readSheetPreferences(rememberSheetPreference(before, { size: "large" }))).toEqual({
      readings: "1",
      size: "large",
    });
  });

  /* What the sheet is stays in the address; only how it looks is remembered. */
  it("remembers how a sheet looks and not what is on it", () => {
    expect([...SHEET_PREFERENCE_KEYS]).toEqual(["model", "readings", "numbers", "fill", "size"]);
  });
});

/*
 * John: Show readings is always unchecked, isn't it having memory? It was not:
 * every setting lived in the address, and a worksheet link built for one kanji
 * says nothing about how the reader likes their sheet.
 */
describe("what the sheet opens as", () => {
  const target = null;

  it("takes the remembered setting when the address is silent", () => {
    expect(readSheetOptions({ mode: "strokes" }, target).showReadings).toBe(false);
    expect(readSheetOptions({ mode: "strokes" }, target, { readings: "1" }).showReadings).toBe(true);
    expect(readSheetOptions({}, target, { size: "small" }).size).toBe("small");
    expect(readSheetOptions({}, target, { numbers: "0" }).showNumbers).toBe(false);
    expect(readSheetOptions({}, target, { fill: "1" }).fill).toBe(true);
    expect(readSheetOptions({}, target, { model: "0" }).showModel).toBe(false);
  });

  /* A link renders the same for whoever opens it, whatever they prefer. */
  it("lets the address win over the memory, both ways", () => {
    expect(readSheetOptions({ readings: "0" }, target, { readings: "1" }).showReadings).toBe(false);
    expect(readSheetOptions({ readings: "1" }, target, { readings: "0" }).showReadings).toBe(true);
    expect(readSheetOptions({ size: "large" }, target, { size: "small" }).size).toBe("large");
  });

  /* The reference sheet is mostly readings, so they are on there by default. */
  it("keeps each default for a reader who has chosen nothing", () => {
    expect(readSheetOptions({ mode: "reference" }, target).showReadings).toBe(true);
    expect(readSheetOptions({ mode: "strokes" }, target).showReadings).toBe(false);
    expect(readSheetOptions({}, target).showNumbers).toBe(true);
    expect(readSheetOptions({}, target).showModel).toBe(true);
    expect(readSheetOptions({}, target).fill).toBe(false);
  });
});
