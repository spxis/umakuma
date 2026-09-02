import { describe, expect, it } from "vitest";

import { GAME_KIND_SLUGS, gameKindForSlug, gameKindHref } from "./gameKindAddress";
import { GAME_KINDS, GAME_KIND_VALUES } from "./gameMode";

describe("a game in the address", () => {
  it("gives every game a name a member can read", () => {
    expect(GAME_KIND_SLUGS[GAME_KINDS.revenge]).toBe("practice");
    expect(GAME_KIND_SLUGS[GAME_KINDS.timeAttack]).toBe("time-attack");
    expect(new Set(Object.values(GAME_KIND_SLUGS)).size).toBe(GAME_KIND_VALUES.length);
  });

  it("reads every one of them back", () => {
    for (const kind of GAME_KIND_VALUES) {
      expect(gameKindForSlug(GAME_KIND_SLUGS[kind])).toBe(kind);
    }
    expect(gameKindForSlug("TIME-ATTACK")).toBe(GAME_KINDS.timeAttack);
  });

  it("answers nothing for a name that is not a game", () => {
    expect(gameKindForSlug("chess")).toBeNull();
    expect(gameKindForSlug(undefined)).toBeNull();
    /* The stored value is not the address; only the slug is. */
    expect(gameKindForSlug("time_attack")).toBeNull();
  });

  it("addresses the hub and each game under the member", () => {
    expect(gameKindHref("john", null)).toBe("/users/john/game");
    expect(gameKindHref("john", GAME_KINDS.revenge)).toBe("/users/john/game/practice");
  });
});
