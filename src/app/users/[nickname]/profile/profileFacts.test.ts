import { describe, expect, it } from "vitest";

import { wanikaniFact } from "./profileFacts";

const ADDRESS = "rin-dahl";

describe("the WaniKani fact", () => {
  it("offers the connection page to a member who has none", () => {
    const fact = wanikaniFact({ connected: false, wkLevel: null, address: ADDRESS });
    expect(fact.value).toBe("Not connected");
    expect(fact.action).toEqual({ label: "Connect WaniKani", href: "/users/rin-dahl/wanikani" });
  });

  it("states the level of a connection that has synced", () => {
    const fact = wanikaniFact({ connected: true, wkLevel: 12, address: ADDRESS });
    expect(fact.value).toBe("Level 12");
    expect(fact.action?.label).toBe("Replace token");
  });

  /*
   * The bug. A token whose first sync has not landed has no level, and the
   * card answered "Level 0" - a standing nobody holds, and the very number the
   * leaderboard refuses to rank an account at.
   */
  it("never states a level nobody has", () => {
    for (const wkLevel of [null, 0]) {
      const fact = wanikaniFact({ connected: true, wkLevel, address: ADDRESS });
      expect(fact.value, String(wkLevel)).toBe("Connected");
      expect(fact.hint, String(wkLevel)).toBe("Your level arrives with the first sync.");
    }
  });

  it("escapes an address that needs it", () => {
    expect(wanikaniFact({ connected: false, wkLevel: null, address: "a b" }).action?.href).toBe("/users/a%20b/wanikani");
  });
});
