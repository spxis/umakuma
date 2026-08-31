import { describe, expect, it } from "vitest";

import { UNCONNECTED_GAME_LEVEL_CAP, unconnectedPoolLevelCap } from "./unconnectedGamePool";

/*
 * The games drew only from an account's WaniKani assignments, so a player who
 * had never connected had a pool of nothing: Match and Shiritori both answered
 * "Only 0 eligible items are available", while the lobby offered them and the
 * welcome copy promised them. The subjects were never personal - they are the
 * shared catalogue, which Daily Challenge has always played straight off.
 */
describe("the pool for a player with no WaniKani", () => {
  it("draws from a slice of the catalogue rather than the whole of it", () => {
    expect(UNCONNECTED_GAME_LEVEL_CAP).toBeGreaterThan(0);
    // Sixty levels of vocabulary is a dictionary, not a game.
    expect(UNCONNECTED_GAME_LEVEL_CAP).toBeLessThan(60);
  });

  it("takes a level asked for exactly, not as a ceiling", () => {
    // Choosing level 3 means level 3. Reading it as "up to 3" would quietly
    // mix beginner content into a level the player picked deliberately.
    expect(unconnectedPoolLevelCap(3, null)).toBe(3);
    expect(unconnectedPoolLevelCap(42, null)).toBe(42);
    expect(unconnectedPoolLevelCap(1, 30)).toBe(1);
  });

  it("falls back to the cap when no level is asked for", () => {
    expect(unconnectedPoolLevelCap(null, null)).toBe(UNCONNECTED_GAME_LEVEL_CAP);
    expect(unconnectedPoolLevelCap(null, 0)).toBe(UNCONNECTED_GAME_LEVEL_CAP);
  });

  /*
   * An account can hold a WaniKani level from an earlier sync while its
   * assignment cache is empty or stale. Dropping a level 30 player to beginner
   * content would be a worse answer than the empty pool was.
   */
  it("keeps a player's own level when it is above the cap", () => {
    expect(unconnectedPoolLevelCap(null, 30)).toBe(30);
    expect(unconnectedPoolLevelCap(null, UNCONNECTED_GAME_LEVEL_CAP + 1)).toBe(
      UNCONNECTED_GAME_LEVEL_CAP + 1,
    );
    // But never below it, however low the stored level is.
    expect(unconnectedPoolLevelCap(null, 2)).toBe(UNCONNECTED_GAME_LEVEL_CAP);
  });
});
