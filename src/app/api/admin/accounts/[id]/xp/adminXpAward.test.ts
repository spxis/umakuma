import { describe, expect, it } from "vitest";

import { ADMIN_AWARD_DEFAULT_NOTE, ADMIN_XP_AWARD_MAX, adminAwardNote } from "./adminXpAward";

describe("adminAwardNote", () => {
  it("keeps the admin's words verbatim", () => {
    expect(adminAwardNote("turned up to the Saturday session")).toBe("turned up to the Saturday session");
  });

  it("trims, since a trailing space is not a note", () => {
    expect(adminAwardNote("  a good week  ")).toBe("a good week");
  });

  /*
   * Never blank. `XpEvent.note` is what a member reads on their history, and a
   * line with no note reads as something they earned - which for an admin
   * award is not true.
   */
  it("falls back to saying an admin did it", () => {
    expect(adminAwardNote("")).toBe(ADMIN_AWARD_DEFAULT_NOTE);
    expect(adminAwardNote("   ")).toBe(ADMIN_AWARD_DEFAULT_NOTE);
    expect(adminAwardNote(null)).toBe(ADMIN_AWARD_DEFAULT_NOTE);
    expect(adminAwardNote(undefined)).toBe(ADMIN_AWARD_DEFAULT_NOTE);
  });

  /* The admin's own address must not travel into member-facing copy. */
  it("puts no identity in the note", () => {
    expect(ADMIN_AWARD_DEFAULT_NOTE).not.toContain("@");
  });
});

describe("ADMIN_XP_AWARD_MAX", () => {
  /* A fat-finger guard, not a policy - so it has to be far above any award
     anybody would actually make, and still finite. */
  it("is a generous but finite ceiling", () => {
    expect(ADMIN_XP_AWARD_MAX).toBeGreaterThan(10_000);
    expect(Number.isFinite(ADMIN_XP_AWARD_MAX)).toBe(true);
  });
});
