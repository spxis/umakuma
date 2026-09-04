import { describe, expect, it } from "vitest";

import { ALL_MARK_LAYERS, MAP_MARK_STATUSES, filterMarks, isMapMarkStatus, markFor, markIsEmpty, markTone, markTotals, toggleStatus, visibleMark, type MapMarkIndex } from "./mapMarks";

describe("what a member has said about a region", () => {
  const index: MapMarkIndex = {
    "3": { status: MAP_MARK_STATUSES.known, visited: true },
    "8": { status: MAP_MARK_STATUSES.practice, visited: false },
    "47": { status: null, visited: true },
  };

  it("reads a mark by code, whether the code is a number or a letter", () => {
    expect(markFor(index, 3)).toEqual({ status: "known", visited: true });
    expect(markFor(index, "3")).toEqual({ status: "known", visited: true });
  });

  /* An unmarked region is not an error; it is the common case. */
  it("reads nothing said for a region nobody has marked", () => {
    expect(markFor(index, "TX")).toEqual({ status: null, visited: false });
  });

  it("counts what has been said, and counts the two facts separately", () => {
    expect(markTotals(index)).toEqual({ known: 1, practice: 1, visited: 2 });
  });
});

describe("pressing a status", () => {
  /*
   * The only way back to "I have not said". A third button for it would be one
   * nobody presses on purpose and everybody presses by accident.
   */
  it("clears the status when the one already set is pressed again", () => {
    expect(toggleStatus(MAP_MARK_STATUSES.known, MAP_MARK_STATUSES.known)).toBeNull();
  });

  it("replaces the other status rather than adding to it", () => {
    expect(toggleStatus(MAP_MARK_STATUSES.practice, MAP_MARK_STATUSES.known)).toBe("known");
    expect(toggleStatus(null, MAP_MARK_STATUSES.practice)).toBe("practice");
  });

  it("knows its own values", () => {
    expect(isMapMarkStatus("known")).toBe(true);
    expect(isMapMarkStatus("been-here")).toBe(false);
  });
});

describe("whether a mark is worth storing", () => {
  /*
   * Nothing said is nothing stored, or the table fills with rows meaning "no
   * opinion" and every count has to filter them out first.
   */
  it("is empty only when neither fact has been given", () => {
    expect(markIsEmpty({ status: null, visited: false })).toBe(true);
    expect(markIsEmpty({ status: null, visited: true })).toBe(false);
    expect(markIsEmpty({ status: MAP_MARK_STATUSES.known, visited: false })).toBe(false);
  });
});

describe("how the map paints it", () => {
  /*
   * Being there and knowing it are independent, so the map has to show both at
   * once - a prefecture somebody has visited and cannot name is exactly the
   * one worth seeing.
   */
  it("has a tone for each pairing", () => {
    expect(markTone({ status: MAP_MARK_STATUSES.known, visited: false })).toBe("known");
    expect(markTone({ status: MAP_MARK_STATUSES.known, visited: true })).toBe("knownVisited");
    expect(markTone({ status: MAP_MARK_STATUSES.practice, visited: false })).toBe("practice");
    expect(markTone({ status: MAP_MARK_STATUSES.practice, visited: true })).toBe("practiceVisited");
    expect(markTone({ status: null, visited: true })).toBe("visited");
  });

  it("paints nothing for a region nobody has marked", () => {
    expect(markTone({ status: null, visited: false })).toBeNull();
  });
});

/*
 * Turning a layer off changes the picture, not the marks. The panel's buttons
 * read the real index; only the paint reads the filtered one.
 */
describe("showing some of the marks", () => {
  const known = { status: MAP_MARK_STATUSES.known, visited: true };

  it("shows everything with every layer on", () => {
    expect(visibleMark(known, ALL_MARK_LAYERS)).toEqual(known);
    const index = { "1": known };
    expect(filterMarks(index, ALL_MARK_LAYERS)).toBe(index);
  });

  it("drops a status whose layer is off and keeps the rest", () => {
    expect(visibleMark(known, { ...ALL_MARK_LAYERS, known: false })).toEqual({ status: null, visited: true });
    expect(markTone(visibleMark(known, { ...ALL_MARK_LAYERS, known: false }))).toBe("visited");
  });

  it("drops the visit on its own", () => {
    expect(visibleMark(known, { ...ALL_MARK_LAYERS, visited: false })).toEqual({ status: MAP_MARK_STATUSES.known, visited: false });
    expect(markTone(visibleMark(known, { ...ALL_MARK_LAYERS, visited: false }))).toBe("known");
  });

  it("paints nothing when every layer is off", () => {
    const off = { known: false, practice: false, visited: false };
    expect(markTone(visibleMark(known, off))).toBeNull();
  });
});
