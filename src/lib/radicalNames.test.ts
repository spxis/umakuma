import { describe, expect, it } from "vitest";

import { resolveRadicalTokens } from "./radicalNames";

/*
 * The classical radicals this site indexes by. Enough of them to show the
 * lookup working without loading the file the server reads.
 */
const RADICALS = ["日", "月", "口", "木", "水", "火", "ハ"];

/**
 * A radical named in English rather than drawn.
 *
 * Somebody looking up a character they cannot read is often in the same
 * position with its parts, so a command that could only be written in Japanese
 * left the typed half of the feature useless to the reader it was built for.
 *
 * Only the dictionary half is exercised here: WaniKani's names come from the
 * catalogue table, and a test with no database gets none, which is the same
 * path a deploy takes before its first sync.
 */
describe("resolveRadicalTokens", () => {
  it("takes a character as itself", async () => {
    await expect(resolveRadicalTokens(["日", "月"], RADICALS)).resolves.toEqual(["日", "月"]);
  });

  it("reads the English name of a radical that is also a kanji", async () => {
    await expect(resolveRadicalTokens(["sun", "moon"], RADICALS)).resolves.toEqual(["日", "月"]);
    await expect(resolveRadicalTokens(["mouth"], RADICALS)).resolves.toEqual(["口"]);
  });

  it("does not care about case or stray space", async () => {
    await expect(resolveRadicalTokens([" Sun "], RADICALS)).resolves.toEqual(["日"]);
  });

  it("mixes a name and a character in one command", async () => {
    await expect(resolveRadicalTokens(["sun", "月"], RADICALS)).resolves.toEqual(["日", "月"]);
  });

  /* Naming the same radical twice narrows nothing, so it is named once. */
  it("keeps each radical once", async () => {
    await expect(resolveRadicalTokens(["sun", "日"], RADICALS)).resolves.toEqual(["日"]);
  });

  /*
   * WaniKani draws some of its radicals rather than writing them, so "beggar"
   * names a picture and no character in this set. Better nothing than a guess
   * at a neighbour.
   */
  it("answers with nothing for a name it does not hold", async () => {
    await expect(resolveRadicalTokens(["beggar"], RADICALS)).resolves.toEqual([]);
    await expect(resolveRadicalTokens(["not a radical at all"], RADICALS)).resolves.toEqual([]);
  });
});
