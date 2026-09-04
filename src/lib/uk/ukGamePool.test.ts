import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MAP_SUBJECT_ID_BASE } from "@/lib/japanPrefectures";
import { isUkGameSubjectId, toUkGameSubjectId, ukSubjectIdFrom, UK_SUBJECT_ID_BASE } from "@/lib/ladder/ukSubjectIds";

/**
 * The curriculum on the game board.
 *
 * What has to hold is that three sources of subject can share one set of
 * tables without a run recording which one it came from — the id says.
 */
describe("the UmaKuma game pool", () => {
  it("keeps its ids clear of WaniKani below and the map above", () => {
    /* WaniKani's catalogue tops out around 9,539 and StudySubjectTag has no
       column saying which system an id came from, so an overlap would tag
       WaniKani's 一 when a member tagged curriculum item 440. */
    expect(UK_SUBJECT_ID_BASE).toBeGreaterThan(9_539);
    expect(UK_SUBJECT_ID_BASE).toBeLessThan(MAP_SUBJECT_ID_BASE);
    expect(isUkGameSubjectId(MAP_SUBJECT_ID_BASE)).toBe(false);
    expect(isUkGameSubjectId(9_539)).toBe(false);
  });

  it("round-trips a row id through the reserved range", () => {
    expect(ukSubjectIdFrom(toUkGameSubjectId(8_449))).toBe(8_449);
  });

  it("resolves a question's source from the id alone", () => {
    /* Map mode proved the pattern: no run column, no migration, and a run
       recorded before a source existed still resolves correctly. */
    const server = readFileSync("src/lib/gameModeServer.ts", "utf8");
    expect(server).toContain("isUkGameSubjectId(id)");
    expect(server).toContain("!isGeoSubjectId(id) && !isUkGameSubjectId(id)");
  });

  it("drops items with no meaning rather than drawing an unanswerable tile", () => {
    /* Three of the RADKFILE radicals up to level 10 have no meaning at all -
       they are shapes. A tile whose answer is blank cannot be answered. */
    const pool = readFileSync("src/lib/uk/ukGamePool.ts", "utf8");
    expect(pool).toContain("if (meanings.length === 0 || !row.characters.trim()) return [];");
  });

  it("does not persist which ladder a run played on", () => {
    /* Same reasoning as mapCountry: the questions carry it. A column would be
       a second place for the answer to live, and they can disagree. */
    const create = readFileSync("src/lib/gameRunCreate.ts", "utf8");
    expect(create).toContain("ladder?: GameLadder");
    /* Scoped to the GameRun model: the word "ladder" appears in the schema's
       prose, and matching that told me nothing. */
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const model = schema.slice(schema.indexOf("model GameRun {"));
    expect(model.slice(0, model.indexOf("\n}"))).not.toMatch(/^\s*ladder\s/m);
  });

  it("leaves the level bonus on WaniKani's scale", () => {
    /* Rescaling the divisor to our hundred reduces the bonus on every score
       already recorded. Tried, measured, reverted. */
    const scoring = readFileSync("src/lib/gameScoring.ts", "utf8");
    expect(scoring).toContain("GAME_MAX_LEVEL_BONUS_SCALE = 60");
  });
});
