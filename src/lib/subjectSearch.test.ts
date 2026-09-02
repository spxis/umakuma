import { describe, expect, it } from "vitest";

import { subjectMatchesQuery } from "./subjectSearch";

const water = { glyph: "水", meanings: ["Water"], readings: ["みず", "スイ"] };
const lake = { glyph: "湖", meanings: ["Lake"], readings: ["みずうみ"] };
const noReading = { glyph: "渕", meanings: ["Riverbank"], readings: [null] };

describe("finding a subject in a list the way search finds it", () => {
  it("matches the English, in any case", () => {
    expect(subjectMatchesQuery("water", water)).toBe(true);
    expect(subjectMatchesQuery("WAT", water)).toBe(true);
  });

  /* The bug: "water" found 水 in a list and "mizu" found nothing, while the
     search box on the same page found both. */
  it("matches a romaji reading", () => {
    expect(subjectMatchesQuery("mizu", water)).toBe(true);
    expect(subjectMatchesQuery("mizuumi", lake)).toBe(true);
    expect(subjectMatchesQuery("sui", water)).toBe(true);
  });

  it("matches kana in either script, and the characters themselves", () => {
    expect(subjectMatchesQuery("みず", water)).toBe(true);
    expect(subjectMatchesQuery("ミズ", water)).toBe(true);
    expect(subjectMatchesQuery("水", water)).toBe(true);
  });

  it("says no to what is not there", () => {
    expect(subjectMatchesQuery("fire", water)).toBe(false);
    expect(subjectMatchesQuery("hi", water)).toBe(false);
  });

  it("keeps everything for an empty query, and copes with a missing reading", () => {
    expect(subjectMatchesQuery("   ", water)).toBe(true);
    expect(subjectMatchesQuery("bank", noReading)).toBe(true);
    expect(subjectMatchesQuery("mizu", noReading)).toBe(false);
  });
});
