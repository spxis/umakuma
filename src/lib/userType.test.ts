import { UserType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { isTestUser, isUserType, USER_TYPES } from "./userType";

describe("USER_TYPES", () => {
  it("matches the Prisma enum exactly, so a query and a constant cannot disagree", () => {
    expect(Object.values(USER_TYPES).sort()).toEqual(Object.values(UserType).sort());
  });

  it("recognises its own values and nothing else", () => {
    expect(isUserType("member")).toBe(true);
    expect(isUserType("test")).toBe(true);
    expect(isUserType("internal")).toBe(false);
    expect(isUserType("")).toBe(false);
  });

  it("treats only a test account as one, and a missing value as a person", () => {
    expect(isTestUser(USER_TYPES.test)).toBe(true);
    expect(isTestUser(USER_TYPES.member)).toBe(false);
    expect(isTestUser(null)).toBe(false);
    expect(isTestUser(undefined)).toBe(false);
  });
});
