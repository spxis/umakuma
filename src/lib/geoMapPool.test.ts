import { describe, expect, it } from "vitest";

import { buildMapQuestions } from "./gameMapQuestions";
import { seededRandom } from "./gameRandom";
import { geoMapDiagonal, geoMapEntries, geoMapOption } from "./geoMapPool";
import { GEO_REGION_COUNTS, geoRegionIdFromSubjectId } from "./geoSubjectIds";

describe("geoMapEntries", () => {
  it("covers every region of each country", () => {
    expect(geoMapEntries("JP")).toHaveLength(GEO_REGION_COUNTS.JP);
    expect(geoMapEntries("US")).toHaveLength(GEO_REGION_COUNTS.US);
    expect(geoMapEntries("CA")).toHaveLength(GEO_REGION_COUNTS.CA);
  });

  /*
   * A tile always prints something. Japan has kanji for its prefectures; the
   * others have no native script of their own, so the name stands in for it.
   */
  it("gives every region something to print on a tile", () => {
    for (const country of ["JP", "US", "CA"] as const) {
      for (const entry of geoMapEntries(country)) {
        expect(entry.kanji.length, `${country} ${entry.code}`).toBeGreaterThan(0);
        expect(entry.romaji.length, `${country} ${entry.code}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps each country on its own id range", () => {
    for (const country of ["JP", "US", "CA"] as const) {
      for (const entry of geoMapEntries(country)) {
        const id = geoMapOption(entry).subjectId;
        expect(geoRegionIdFromSubjectId(id), `${country} ${entry.code}`).toBe(`${country}-${entry.code}`);
      }
    }
  });

  it("scales distance to the country's own map", () => {
    expect(geoMapDiagonal("US")).toBeGreaterThan(0);
    expect(geoMapDiagonal("CA")).toBeGreaterThan(0);
  });
});

describe("buildMapQuestions over another country", () => {
  it("builds a round of American states", () => {
    const questions = buildMapQuestions(8, 4, () => 0.42, "read", "auto", geoMapEntries("US"));

    expect(questions).toHaveLength(8);
    for (const question of questions) {
      // Every id in the question belongs to the country it was built from.
      const ids = [question.targetSubjectId, question.leftSubjectId, question.rightSubjectId];
      for (const id of ids) {
        expect(geoRegionIdFromSubjectId(id)?.startsWith("US-")).toBe(true);
      }
    }
  });

  it("builds a round of Canadian provinces despite the small pool", () => {
    // Thirteen regions is fewer than most rounds ask for; it must still fill.
    const questions = buildMapQuestions(10, 4, () => 0.11, "read", "auto", geoMapEntries("CA"));
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      expect(geoRegionIdFromSubjectId(question.targetSubjectId)?.startsWith("CA-")).toBe(true);
    }
  });

  it("still defaults to Japan when no pool is given", () => {
    const questions = buildMapQuestions(5, 2, () => 0.3);
    for (const question of questions) {
      expect(geoRegionIdFromSubjectId(question.targetSubjectId)?.startsWith("JP-")).toBe(true);
    }
  });
});


describe("the capitals round", () => {
  /*
   * The same question with a different label: the prompt names a city, the
   * tiles are still the regions. Nothing about scoring or ids changes.
   */
  it("asks with the capital instead of the region name", () => {
    const questions = buildMapQuestions(5, 2, seededRandom("capitals"), "find", "capital", geoMapEntries("CA"));
    const capitals = new Set(geoMapEntries("CA").map((entry) => entry.capital));

    for (const question of questions) {
      expect(question.promptOverride, "the capitals round must override the prompt").toBeTruthy();
      expect(capitals.has(question.promptOverride!), question.promptOverride ?? "").toBe(true);
    }
  });

  it("leaves the prompt alone in every other mode", () => {
    for (const mode of ["auto", "meaning", "reading"] as const) {
      const [question] = buildMapQuestions(4, 2, seededRandom(mode), "find", mode, geoMapEntries("US"));
      expect(question?.promptOverride, mode).toBeNull();
    }
  });

  it("knows a capital for every region of every country", () => {
    for (const country of ["JP", "US", "CA"] as const) {
      const missing = geoMapEntries(country).filter((entry) => !entry.capital).map((e) => String(e.code));
      expect(missing, `${country} regions with no capital`).toEqual([]);
    }
  });
});
