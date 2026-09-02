import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { charactersFromCatalog } from "./leaderboardJlpt";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * The JLPT counts on the leaderboard.
 *
 * They need one static fact about each learned kanji - the character - and
 * they were asking WaniKani for it in 200-id chunks, so a member with fifteen
 * hundred learned kanji cost eight sequential round trips on every stats
 * computation for data the local catalogue already holds. Subjects are static
 * and synced; assignments are the member's own state and stay live.
 */
describe("what the catalogue answers", () => {
  const row = (wkSubjectId: number, characters: string | null) => ({ wkSubjectId, characters });

  it("answers from the catalogue and asks for nothing else", () => {
    const { characters, missing } = charactersFromCatalog([1, 2], [row(1, "日"), row(2, "月")]);
    expect([...characters]).toEqual(["日", "月"]);
    expect(missing).toEqual([]);
  });

  it("leaves only what the catalogue has never seen for the API", () => {
    const { characters, missing } = charactersFromCatalog([1, 2, 3], [row(1, "日")]);
    expect([...characters]).toEqual(["日"]);
    expect(missing).toEqual([2, 3]);
  });

  /*
   * A row with no characters is an answer, not a hole: WaniKani draws some of
   * its subjects rather than writing them, and going back to the API for a
   * character that does not exist would restore the cost this removed.
   */
  it("treats a row with no characters as answered", () => {
    const { characters, missing } = charactersFromCatalog([7], [row(7, null)]);
    expect([...characters]).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("counts a character once however many subjects share it", () => {
    const { characters } = charactersFromCatalog([1, 2], [row(1, "生"), row(2, "生")]);
    expect(characters.size).toBe(1);
  });

  it("has nothing to ask for when nothing was learned", () => {
    expect(charactersFromCatalog([], [])).toEqual({ characters: new Set(), missing: [] });
  });
});

/*
 * The order is the point, and it is easy to undo by accident: a later edit
 * that reaches for the API first would pass every test above while restoring
 * the round trips.
 */
describe("the order it asks in", () => {
  it("reads the catalogue before it reaches for WaniKani", () => {
    const source = read("src/lib/wanikani/leaderboardJlpt.ts");
    const catalogAt = source.indexOf("prisma.wkSubjectCatalog.findMany");
    const apiAt = source.indexOf("fetchAllCollectionPages(`/subjects?ids=");
    expect(catalogAt, "the catalogue query should be there").toBeGreaterThan(-1);
    expect(apiAt, "the API fallback should still be there").toBeGreaterThan(-1);
    expect(catalogAt).toBeLessThan(apiAt);
  });

  it("asks the API for the missing ids rather than all of them", () => {
    const source = read("src/lib/wanikani/leaderboardJlpt.ts");
    expect(source).toContain("missing.slice(i, i + chunkSize)");
  });
});
