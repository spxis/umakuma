import { describe, expect, it } from "vitest";

import { INTERNAL_TENURE_DAYS, MEMBER_KINDS, isInternalKind, memberKindFor, qualifiesAsInternal } from "./memberKind";

describe("what kind of member somebody is", () => {
  it("reads an admin as an admin, whatever the flag says", () => {
    expect(memberKindFor({ isAdmin: true, internal: false })).toBe(MEMBER_KINDS.admin);
    expect(memberKindFor({ isAdmin: true, internal: true })).toBe(MEMBER_KINDS.admin);
  });

  it("tells an internal member from everybody else", () => {
    expect(memberKindFor({ isAdmin: false, internal: true })).toBe(MEMBER_KINDS.internal);
    expect(memberKindFor({ isAdmin: false, internal: false })).toBe(MEMBER_KINDS.member);
  });

  /* The reading challenge is one family's arrangement, not a feature of the site. */
  it("offers the reading challenge to the family and to nobody else", () => {
    expect(isInternalKind(MEMBER_KINDS.admin)).toBe(true);
    expect(isInternalKind(MEMBER_KINDS.internal)).toBe(true);
    expect(isInternalKind(MEMBER_KINDS.member)).toBe(false);
  });
});

describe("who counts as internal without being told", () => {
  const now = new Date("2026-09-02T00:00:00Z");
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  it("takes a WaniKani member who has been here a month", () => {
    expect(qualifiesAsInternal({ hasWanikani: true, createdAt: daysAgo(INTERNAL_TENURE_DAYS) }, now)).toBe(true);
    expect(qualifiesAsInternal({ hasWanikani: true, createdAt: daysAgo(400) }, now)).toBe(true);
  });

  it("leaves out a new sign-in and anybody with no WaniKani", () => {
    expect(qualifiesAsInternal({ hasWanikani: true, createdAt: daysAgo(3) }, now)).toBe(false);
    expect(qualifiesAsInternal({ hasWanikani: false, createdAt: daysAgo(400) }, now)).toBe(false);
  });

  it("reads a stored date as well as a date", () => {
    expect(qualifiesAsInternal({ hasWanikani: true, createdAt: daysAgo(90).toISOString() }, now)).toBe(true);
  });
});
