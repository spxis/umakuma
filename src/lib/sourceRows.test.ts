import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SOURCE_KEY_VALUES, SOURCE_KEYS } from "./sourceCredits";
import {
  curriculumRows,
  jitenRows,
  jmdictRows,
  kanjidic2Rows,
  kanjivgRows,
  mapRows,
  radkfileRows,
} from "./sourceRowReaders";
import { ROWS_PAGE_SIZE } from "./sourceRows";
import { SHOWCASE_DEFAULTS } from "./sourceShowcase";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * The browser's whole job is that a picked row is true.
 *
 * The showcase began as hand-written constants and thirteen of its figures
 * were wrong - a radical said to be in 1,443 characters that is in 1,337, a
 * kanji put on WaniKani level 60 that is on 50. An admin picking from these
 * rows should be unable to repeat that, which only holds if the rows say what
 * the data says.
 */
describe("the rows an admin picks from", () => {
  it("draws the same figures the chosen defaults quote", () => {
    const radicals = radkfileRows();
    const mouth = radicals.find((row) => row.specimen === "口");
    expect(mouth?.detail).toBe("3 strokes · in 1,337 characters");
    /* Which is the line the public card already shows. */
    expect(SHOWCASE_DEFAULTS[SOURCE_KEYS.radkfile][0].detail).toBe(mouth?.detail);

    const flute = radicals.find((row) => row.specimen === "龠");
    expect(flute?.detail).toBe("17 strokes · in 3 characters");
    expect(SHOWCASE_DEFAULTS[SOURCE_KEYS.radkfile][1].detail).toBe(flute?.detail);
  });

  it("reads every file-backed source without touching the database", () => {
    for (const rows of [kanjidic2Rows(), radkfileRows(), kanjivgRows(), curriculumRows(), jmdictRows(), jitenRows()]) {
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows.slice(0, 50)) {
        expect(row.specimen.length).toBeGreaterThan(0);
        expect(row.detail.length).toBeGreaterThan(0);
      }
    }
  });

  /*
   * Page one should be the words worth showing. Not rank 1 - the first dozen
   * ranks are particles and other words WaniKani does not teach, so the
   * commonest word we hold is 13th - but the order has to be the corpus's.
   */
  it("puts the commonest words first, so page one is worth looking at", () => {
    const ranks = jitenRows()
      .slice(0, 200)
      .map((row) => Number(/^Rank ([\d,]+) in anime/.exec(row.detail)?.[1].replace(/,/g, "")));
    expect(ranks[0]).toBeLessThan(50);
    expect([...ranks].sort((left, right) => left - right)).toEqual(ranks);

    expect(jmdictRows()[0].detail).toBe("Band 1 of 48 in print");
  });

  /* "1 strokes" survives a review and then sits on a page crediting somebody. */
  it("counts in words that agree with the number", () => {
    const one = kanjidic2Rows().find((row) => row.specimen === "一");
    expect(one?.detail).toContain("1 stroke ·");
    expect(one?.detail).not.toContain("1 strokes");
    /* By the count rather than by glyph: the file's vertical stroke is the
       fullwidth ｜, and hardcoding the wrong codepoint tests nothing. */
    const singleStroke = radkfileRows().filter((row) => row.detail.startsWith("1 "));
    expect(singleStroke.length).toBeGreaterThan(0);
    for (const row of singleStroke) expect(row.detail).toMatch(/^1 stroke ·/);

    const single = mapRows("JP").filter((row) => row.detail.includes("land border"));
    for (const row of single) {
      if (row.detail.startsWith("1 ")) expect(row.detail).toBe("1 land border");
    }
  });

  it("counts a region's borders the way the map does", () => {
    const japan = mapRows("JP");
    expect(japan.find((row) => row.specimen === "長野県")?.detail).toBe("8 land borders");
    expect(japan.find((row) => row.specimen === "沖縄県")?.detail).toBe("No land borders");
    expect(mapRows("US").find((row) => row.specimen === "Alaska")?.detail).toBe("No land borders");
  });

  it("has a reader for every source", () => {
    /* Comments name keys too; strip them before looking for real cases. */
    const code = read("src/lib/sourceRows.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    for (const key of SOURCE_KEY_VALUES) {
      expect(code, `${key} has no case in buildRows`).toContain(`case SOURCE_KEYS.${key}:`);
    }
  });

  it("pages at a size somebody can read in one screen", () => {
    expect(ROWS_PAGE_SIZE).toBeGreaterThan(5);
    expect(ROWS_PAGE_SIZE).toBeLessThanOrEqual(50);
  });
});

/** Both new routes take an admin, and the write one validates its body. */
describe("the picker's routes", () => {
  it.each([
    "src/app/api/admin/sources/[source]/rows/route.ts",
    "src/app/api/admin/sources/[source]/showcase/route.ts",
  ])("checks who is asking in %s", (path) => {
    const code = read(path);
    expect(code).toContain("isAuthorizedAdmin");
    expect(code, "an unknown source must 404, not read an undefined reader").toContain("isSourceKey");
  });

  it("validates the rows it stores and caps how many", () => {
    const code = read("src/app/api/admin/sources/[source]/showcase/route.ts");
    expect(code).toContain("SHOWCASE_MAX_ROWS");
    expect(code).toContain("safeParse");
    /* An admin's own pick should be on the public page at once. */
    expect(code).toContain("clearSourceReportCache");
  });
});
