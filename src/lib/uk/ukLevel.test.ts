import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";

import {
  isUkLevelUnlocked,
  resolveUkLevel,
  UK_LEVEL_PASS_SRS_STAGE,
  UK_LEVEL_UNLOCK_THRESHOLD,
  type UkLevelProgressRow,
  type UkLevelTotals,
} from "./ukLevel";

const TOTALS: UkLevelTotals[] = [
  { level: 1, kanji: 0, radicals: 15 },
  { level: 2, kanji: 10, radicals: 7 },
  { level: 3, kanji: 10, radicals: 8 },
];

function kanjiRows(level: number, count: number, stage = UK_LEVEL_PASS_SRS_STAGE): UkLevelProgressRow[] {
  return Array.from({ length: count }, () => ({ level, kind: SUBJECT_TYPES.kanji, srsStage: stage, passedAt: null }));
}
function radicalRows(level: number, count: number, stage = UK_LEVEL_PASS_SRS_STAGE): UkLevelProgressRow[] {
  return Array.from({ length: count }, () => ({ level, kind: SUBJECT_TYPES.radical, srsStage: stage, passedAt: null }));
}

describe("resolveUkLevel", () => {
  it("starts a member with nothing at the floor", () => {
    expect(resolveUkLevel({ rows: [], totals: TOTALS, floor: 1, maxLevel: 3 }).level).toBe(1);
  });

  it("gates level 1 on its radicals, since it teaches no kanji", () => {
    /* Radicals-only by design: the parts before the characters, and an easier
       way in. Counting kanji here would divide by zero. */
    const nearly = resolveUkLevel({ rows: radicalRows(1, 13), totals: TOTALS, floor: 1, maxLevel: 3 });
    expect(nearly.level).toBe(1);
    const cleared = resolveUkLevel({ rows: radicalRows(1, 14), totals: TOTALS, floor: 1, maxLevel: 3 });
    expect(cleared.level).toBe(2);
  });

  it("needs 90% of a level's kanji at Guru, not all of them", () => {
    const rows = [...radicalRows(1, 15), ...kanjiRows(2, 9)];
    expect(resolveUkLevel({ rows, totals: TOTALS, floor: 1, maxLevel: 3 }).level).toBe(3);
    expect(UK_LEVEL_UNLOCK_THRESHOLD).toBe(0.9);
  });

  it("does not count kanji below Guru", () => {
    const rows = [...radicalRows(1, 15), ...kanjiRows(2, 10, UK_LEVEL_PASS_SRS_STAGE - 1)];
    expect(resolveUkLevel({ rows, totals: TOTALS, floor: 1, maxLevel: 3 }).level).toBe(2);
  });

  it("counts an item that has ever passed, even if it has since fallen back", () => {
    /* A wrong answer drops the stage. It does not un-learn the level. */
    const rows = [
      ...radicalRows(1, 15),
      ...Array.from({ length: 10 }, () => ({
        level: 2,
        kind: SUBJECT_TYPES.kanji,
        srsStage: 1,
        passedAt: new Date("2026-09-01"),
      })),
    ];
    expect(resolveUkLevel({ rows, totals: TOTALS, floor: 1, maxLevel: 3 }).level).toBe(3);
  });

  it("never places a member below their floor", () => {
    /* The floor is what a placement test or a WaniKani import bought. Nothing
       derived may take it away — that is the whole reason it is stored. */
    expect(resolveUkLevel({ rows: [], totals: TOTALS, floor: 3, maxLevel: 3 }).level).toBe(3);
  });

  it("does not let an empty level block the walk", () => {
    /* A level with no items is a gap in the curriculum, not something a member
       can do anything about. */
    const totals: UkLevelTotals[] = [{ level: 1, kanji: 0, radicals: 0 }, { level: 2, kanji: 2, radicals: 0 }];
    expect(resolveUkLevel({ rows: [], totals, floor: 1, maxLevel: 2 }).level).toBe(2);
  });

  it("names what the level is gated on, so nothing calls radicals kanji", () => {
    /* Level 1 teaches no kanji. Reporting "0 of 15 kanji at Guru" there was
       both wrong and, on a member's first day, discouraging. */
    const first = resolveUkLevel({ rows: [], totals: TOTALS, floor: 1, maxLevel: 3 });
    expect(first).toMatchObject({ level: 1, gate: SUBJECT_TYPES.radical, total: 15 });
    const second = resolveUkLevel({ rows: radicalRows(1, 15), totals: TOTALS, floor: 1, maxLevel: 3 });
    expect(second).toMatchObject({ level: 2, gate: SUBJECT_TYPES.kanji, total: 10 });
  });

  it("reports how far through the level it stopped on", () => {
    const rows = [...radicalRows(1, 15), ...kanjiRows(2, 5)];
    const resolved = resolveUkLevel({ rows, totals: TOTALS, floor: 1, maxLevel: 3 });
    expect(resolved).toMatchObject({ level: 2, passed: 5, total: 10 });
    expect(resolved.ratio).toBeCloseTo(0.5);
  });

  it("stops at the top rather than running past it", () => {
    const rows = [...radicalRows(1, 15), ...kanjiRows(2, 10), ...kanjiRows(3, 10)];
    expect(resolveUkLevel({ rows, totals: TOTALS, floor: 1, maxLevel: 3 }).level).toBe(3);
  });

  it("ignores the wrong kind for a level's gate", () => {
    /* Radicals do not clear a level that teaches kanji, or a member could
       level up without meeting a single character. */
    const rows = [...radicalRows(1, 15), ...radicalRows(2, 7)];
    expect(resolveUkLevel({ rows, totals: TOTALS, floor: 1, maxLevel: 3 }).level).toBe(2);
  });
});

describe("isUkLevelUnlocked", () => {
  it("opens everything up to and including the current level", () => {
    expect(isUkLevelUnlocked({ itemLevel: 5, currentLevel: 5 })).toBe(true);
    expect(isUkLevelUnlocked({ itemLevel: 6, currentLevel: 5 })).toBe(false);
  });
});

describe("the schema behind it", () => {
  it("keeps UkPlacementSource equal to the sources raiseUkLevelFloor accepts", async () => {
    /* Read as text: importing the generated client would only prove it agrees
       with itself. This is the drift that failed every radical at seed once —
       a TS union and a Prisma enum listing different members. */
    const { readFileSync } = await import("node:fs");
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const server = readFileSync("src/lib/uk/ukLevelServer.ts", "utf8");
    for (const source of ["placement_test", "wanikani", "self", "admin"]) {
      expect(schema, `${source} in the enum`).toContain(`\n  ${source}\n`);
      expect(server, `${source} in the writer`).toContain(`"${source}"`);
    }
  });

  it("stores the floor and the derived level as separate columns", async () => {
    const { readFileSync } = await import("node:fs");
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("ukLevel             Int                @default(1)");
    expect(schema).toContain("ukLevelFloor        Int                @default(1)");
  });

  it("has exactly one writer for the materialised level", () => {
    /* Narrow on purpose: `ukLevel` as a *field name* is all over the
       custom-study stack, whose own level state was named that first. What
       must stay singular is the Prisma write — six callers updating a derived
       column is how it starts disagreeing with what it derives from. */
    /* The filesystem, not `git ls-files`: a new writer is untracked at the
       moment somebody adds it, which is exactly when this must fire. */
    const files = readdirSync("src", { recursive: true, encoding: "utf8" })
      .map((entry) => `src/${entry}`)
      .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."));
    const writers = files.filter((file) => readFileSync(file, "utf8").includes("data: { ukLevel:"));
    expect(writers).toEqual(["src/lib/uk/ukLevelServer.ts"]);
  });
});
