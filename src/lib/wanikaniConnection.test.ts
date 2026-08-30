import { describe, expect, it, vi } from "vitest";

vi.mock("./crypto", () => ({
  decryptToken: ({ encrypted }: { encrypted: string }) => `decrypted:${encrypted}`,
}));

const { hasWanikaniConnection, onlyConnected, wanikaniConnection } = await import("./wanikaniConnection");

const connected = {
  tokenEncrypted: "e",
  tokenIv: "i",
  tokenTag: "t",
  wkUserId: "u1",
  wkUsername: "john",
  wkLevel: 17,
};

const unconnected = {
  tokenEncrypted: null,
  tokenIv: null,
  tokenTag: null,
  wkUserId: null,
  wkUsername: null,
  wkLevel: null,
};

describe("wanikaniConnection", () => {
  it("decrypts the token when the account is connected", () => {
    expect(wanikaniConnection(connected)?.token).toBe("decrypted:e");
  });

  it("carries the rest of the link alongside the token", () => {
    const link = wanikaniConnection(connected);
    expect(link?.wkUsername).toBe("john");
    expect(link?.wkLevel).toBe(17);
  });

  it("is null for an account with no connection", () => {
    expect(wanikaniConnection(unconnected)).toBeNull();
  });

  /*
   * All six fields move together, so a row missing any one of the token parts
   * is not half-connected - it has no usable connection, and decrypting from a
   * partial triple would throw rather than return something wrong.
   */
  it("treats a partial token as no connection rather than decrypting it", () => {
    expect(wanikaniConnection({ ...connected, tokenIv: null })).toBeNull();
    expect(wanikaniConnection({ ...connected, tokenTag: null })).toBeNull();
    expect(wanikaniConnection({ ...connected, tokenEncrypted: null })).toBeNull();
  });

  it("answers whether a link exists without decrypting anything", () => {
    expect(hasWanikaniConnection(connected)).toBe(true);
    expect(hasWanikaniConnection(unconnected)).toBe(false);
  });
});

describe("onlyConnected", () => {
  /*
   * The leaderboard ranks WaniKani numbers. An unconnected account listed at
   * level zero would read as a real standing rather than an absence.
   */
  it("drops accounts with no connection", () => {
    const rows = onlyConnected([
      { id: "a", wkUsername: "john", wkLevel: 17 },
      { id: "b", wkUsername: null, wkLevel: null },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a"]);
  });

  it("narrows the fields so callers stop null-checking", () => {
    const [row] = onlyConnected([{ id: "a", wkUsername: "john", wkLevel: 17 }]);
    // Typed as string and number here, not string | null.
    expect(row.wkUsername.toUpperCase()).toBe("JOHN");
    expect(row.wkLevel + 1).toBe(18);
  });

  it("drops a row missing either half, not just both", () => {
    expect(onlyConnected([{ wkUsername: "john", wkLevel: null }])).toHaveLength(0);
    expect(onlyConnected([{ wkUsername: null, wkLevel: 17 }])).toHaveLength(0);
  });

  it("handles an empty list", () => {
    expect(onlyConnected([])).toEqual([]);
  });
});
