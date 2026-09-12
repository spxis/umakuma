import { describe, expect, it } from "vitest";

import { USER_TYPES } from "@/lib/userType";

import { membersNewestFirst, type MembersBoardAccount } from "./membersBoard";

const account = (over: Partial<MembersBoardAccount> & { id: string; createdAt: Date }): MembersBoardAccount => ({
  slug: over.id,
  nickname: null,
  displayName: null,
  wkUsername: null,
  wkLevel: null,
  unLevel: 1,
  userType: USER_TYPES.member,
  ...over,
});

/**
 * John: "it shows all the new members, from current to old." Newest at the
 * top, simulated accounts never, and two who joined in the same second are
 * not numbered as if one beat the other.
 */
describe("the members board, newest first", () => {
  it("puts the most recent member first, whatever order they arrived in", () => {
    const rows = membersNewestFirst([
      account({ id: "old", createdAt: new Date("2026-05-01T00:00:00Z") }),
      account({ id: "new", createdAt: new Date("2026-09-10T00:00:00Z") }),
      account({ id: "mid", createdAt: new Date("2026-07-01T00:00:00Z") }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["new", "mid", "old"]);
    expect(rows.map((row) => row.place)).toEqual([1, 2, 3]);
  });

  it("leaves simulated cohort members out, however new they are", () => {
    const rows = membersNewestFirst([
      account({ id: "real", createdAt: new Date("2026-01-01T00:00:00Z") }),
      account({ id: "sim", createdAt: new Date("2026-09-11T00:00:00Z"), userType: USER_TYPES.test }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["real"]);
  });

  it("lets two who joined in the same second share a place", () => {
    const at = new Date("2026-09-01T12:00:00Z");
    const rows = membersNewestFirst([
      account({ id: "b", displayName: "Bea", createdAt: at }),
      account({ id: "a", displayName: "Al", createdAt: at }),
      account({ id: "c", createdAt: new Date("2026-08-01T00:00:00Z") }),
    ]);
    expect(rows.map((row) => [row.id, row.place, row.sharesPlace])).toEqual([
      ["a", 1, false],
      ["b", 1, true],
      ["c", 3, false],
    ]);
  });

  it("names a member the way every other board does, and addresses them by slug", () => {
    const [row] = membersNewestFirst([
      account({ id: "x", slug: "kumachan", displayName: " Kuma ", createdAt: new Date() }),
    ]);
    expect(row?.name).toBe("Kuma");
    expect(row?.address).toBe("kumachan");
  });
});
