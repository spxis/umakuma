import { describe, expect, it } from "vitest";

import {
  ACCOUNT_VISIBILITY,
  ACCOUNT_VISIBILITY_DISPLAY,
  ACCOUNT_VISIBILITY_VALUES,
  DEFAULT_NEW_ACCOUNT_VISIBILITY,
  isAccountVisibility,
  isVisibleTo,
  resolveVisibility,
} from "./accountVisibility";

describe("resolveVisibility", () => {
  it("keeps a stored choice", () => {
    expect(resolveVisibility("private")).toBe(ACCOUNT_VISIBILITY.private);
    expect(resolveVisibility("public")).toBe(ACCOUNT_VISIBILITY.public);
  });

  /*
   * The trap this column set, and did catch us once. Every account that existed
   * before it was on a leaderboard with no visibility filter, so it was visible
   * to anyone at all. Reading null as anything stricter removes an audience
   * that already had access - `family` shipped for ten minutes and emptied the
   * public board.
   */
  it("treats an account from before the column as public, which is what it was", () => {
    expect(resolveVisibility(null)).toBe(ACCOUNT_VISIBILITY.public);
    expect(resolveVisibility(undefined)).toBe(ACCOUNT_VISIBILITY.public);
  });

  it("falls back rather than trusting a value it does not know", () => {
    expect(resolveVisibility("everyone")).toBe(ACCOUNT_VISIBILITY.public);
  });
});

describe("a new account", () => {
  // The signup question defaults here, per the choice made for children.
  it("starts private until the member says otherwise", () => {
    expect(DEFAULT_NEW_ACCOUNT_VISIBILITY).toBe(ACCOUNT_VISIBILITY.private);
  });
});

describe("isVisibleTo", () => {
  it("hides a private member from everyone but an admin", () => {
    expect(isVisibleTo("private", "anonymous")).toBe(false);
    expect(isVisibleTo("private", "member")).toBe(false);
    expect(isVisibleTo("private", "admin")).toBe(true);
  });

  it("shows a family member to other members but not to the open web", () => {
    expect(isVisibleTo("family", "member")).toBe(true);
    expect(isVisibleTo("family", "anonymous")).toBe(false);
  });

  it("shows a public member to anyone", () => {
    expect(isVisibleTo("public", "anonymous")).toBe(true);
    expect(isVisibleTo("public", "member")).toBe(true);
  });

  // The regression, pinned: a signed-out visitor could see these accounts.
  it("keeps existing accounts on the leaderboard for everyone, signed out included", () => {
    expect(isVisibleTo(null, "member")).toBe(true);
    expect(isVisibleTo(null, "anonymous")).toBe(true);
  });
});

describe("the copy", () => {
  it("describes every level, so no option is offered without an explanation", () => {
    for (const value of ACCOUNT_VISIBILITY_VALUES) {
      expect(ACCOUNT_VISIBILITY_DISPLAY[value].label.length).toBeGreaterThan(0);
      expect(ACCOUNT_VISIBILITY_DISPLAY[value].description.length).toBeGreaterThan(10);
    }
  });

  it("knows its own values and rejects others", () => {
    expect(isAccountVisibility("private")).toBe(true);
    expect(isAccountVisibility("friends")).toBe(false);
  });
});
