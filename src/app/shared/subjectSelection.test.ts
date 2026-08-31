import { describe, expect, it } from "vitest";

import {
  decodeSelection,
  encodeSelection,
  selectionRange,
  SUBJECT_SELECTION_LIMIT,
} from "./subjectSelection";

/**
 * A chosen set travels in a URL, so encoding and decoding have to agree
 * exactly. What is chosen is characters, and characters are where naive string
 * handling goes wrong.
 */

describe("carrying a chosen set in a link", () => {
  it("round-trips an ordinary selection", () => {
    const chosen = ["一", "雨", "王"];
    expect(decodeSelection(encodeSelection(chosen))).toEqual(chosen);
  });

  it("keeps the order the member chose", () => {
    // A sheet built in a deliberate order is a different sheet when re-sorted.
    const chosen = ["王", "一", "雨"];
    expect(decodeSelection(encodeSelection(chosen))).toEqual(chosen);
  });

  it("survives kanji outside the Basic Multilingual Plane", () => {
    /*
     * 𠮟 is a single character stored as two UTF-16 units. Splitting the
     * encoded string on "" - the obvious implementation - tears it into two
     * lone surrogates, and the sheet asks for two characters that do not
     * exist. It is in the jōyō list, so this is not a hypothetical.
     */
    const chosen = ["𠮟", "雨"];
    const decoded = decodeSelection(encodeSelection(chosen));
    expect(decoded).toEqual(chosen);
    expect(decoded[0]).toHaveLength(2);
  });

  it("drops duplicates rather than printing a character twice", () => {
    expect(decodeSelection("一一雨")).toEqual(["一", "雨"]);
  });

  it("reads nothing out of nothing", () => {
    expect(decodeSelection(null)).toEqual([]);
    expect(decodeSelection(undefined)).toEqual([]);
    expect(decodeSelection("")).toEqual([]);
  });

  it("stops at the limit rather than building a link a browser refuses", () => {
    const many = Array.from({ length: SUBJECT_SELECTION_LIMIT + 50 }, (_, i) =>
      String.fromCodePoint(0x4e00 + i),
    );
    expect(decodeSelection(encodeSelection(many))).toHaveLength(SUBJECT_SELECTION_LIMIT);
  });
});

/*
 * Shift-click, which is how anyone who has used a file browser expects to take
 * a row of things. Selecting the top-left card and shift-clicking the top-right
 * one should give the whole row, and the reverse sweep should give the same.
 */
describe("selectionRange", () => {
  const row = ["悪", "安", "暗", "医", "委"];

  it("takes both ends and everything between", () => {
    expect(selectionRange("悪", "委", row)).toEqual(row);
  });

  it("reads the same swept backwards", () => {
    expect(selectionRange("委", "悪", row)).toEqual(row);
  });

  it("is one item when both ends are the same card", () => {
    expect(selectionRange("暗", "暗", row)).toEqual(["暗"]);
  });

  /*
   * With nothing anchored there is no range to take, and the caller falls back
   * to an ordinary toggle. Same for an anchor left behind on another page: the
   * alternative is a range measured from -1, which sweeps from the start of the
   * list and picks up everything the member never crossed.
   */
  it("gives nothing to sweep when there is no anchor on screen", () => {
    expect(selectionRange(null, "暗", row)).toEqual([]);
    expect(selectionRange("漢", "暗", row)).toEqual([]);
    expect(selectionRange("悪", "漢", row)).toEqual([]);
  });
});
