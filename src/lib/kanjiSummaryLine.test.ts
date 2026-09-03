import { describe, expect, it } from "vitest";

import { summaryLine } from "./kanjiSummaryLine";

/*
 * Lives in a lib rather than beside the stroke panel because both a client
 * card and the server-rendered page heading need it, and a function exported
 * from a "use client" module cannot be called during a server render - which
 * is exactly how the kanji page broke when it was first moved.
 */
describe("summaryLine", () => {
  it("puts the readings first, then the meaning", () => {
    expect(summaryLine({ on: ["キョウ"], kun: ["おどろ"], meaning: "Surprised" })).toBe(
      "キョウ、おどろ · Surprised",
    );
  });

  it("says only what it knows", () => {
    expect(summaryLine({ meaning: "Not" })).toBe("Not");
    expect(summaryLine({ on: ["フ"] })).toBe("フ");
  });

  it("is null when there is nothing to say", () => {
    expect(summaryLine(undefined)).toBeNull();
    expect(summaryLine({})).toBeNull();
    expect(summaryLine({ meaning: "   ", on: [], kun: [] })).toBeNull();
  });
});
