import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ACCOUNT_APPROVAL } from "./accountApproval";
import { isAccountBarred, isAccountDisabled } from "./accountStanding";

const enabled = { approvalStatus: ACCOUNT_APPROVAL.approved, disabledAt: null };

describe("isAccountDisabled", () => {
  it("reads the absence of a timestamp as enabled", () => {
    expect(isAccountDisabled(null)).toBe(false);
    expect(isAccountDisabled(undefined)).toBe(false);
  });

  it("accepts the timestamp in either shape it arrives in", () => {
    expect(isAccountDisabled(new Date("2026-09-04T12:00:00Z"))).toBe(true);
    expect(isAccountDisabled("2026-09-04T12:00:00.000Z")).toBe(true);
  });
});

describe("isAccountBarred", () => {
  it("lets an approved, enabled account through", () => {
    expect(isAccountBarred(enabled)).toBe(false);
  });

  /*
   * The whole reason the two columns are separate. Somebody waiting still has
   * the run of the site, which is what the signup copy promises them; somebody
   * switched off does not, whatever their approval says.
   */
  it("does not bar a member who is merely waiting", () => {
    expect(isAccountBarred({ approvalStatus: ACCOUNT_APPROVAL.pending, disabledAt: null })).toBe(false);
  });

  it("bars an account that was turned away at the door", () => {
    expect(isAccountBarred({ approvalStatus: ACCOUNT_APPROVAL.rejected, disabledAt: null })).toBe(true);
  });

  it("bars an approved account an admin has switched off", () => {
    expect(
      isAccountBarred({ approvalStatus: ACCOUNT_APPROVAL.approved, disabledAt: new Date() }),
    ).toBe(true);
  });

  /*
   * Both columns are null on every account that predates them, and those
   * accounts were all in use the day before.
   */
  it("lets an account that predates both columns through", () => {
    expect(isAccountBarred({ approvalStatus: null, disabledAt: null })).toBe(false);
  });
});

/*
 * A lock is only as good as the places that consult it, and this one has five
 * doors: the API's owner check, the page-level viewer resolution, the invite
 * cookie, signup, and the boards. Every one of them was found open the first
 * time somebody looked. Reading the sources keeps a later refactor from
 * quietly closing one of them off from the check - and keeps all five asking
 * the *same* predicate, which is the property that stops a second list of who
 * may not come in from drifting away from the first.
 */
describe("the doors the lock has to cover", () => {
  const doors = [
    ["src/lib/accountAccess.ts", "every /api/study and /api/custom-study route"],
    ["src/app/users/[nickname]/userPageAuth.ts", "the user pages and the header"],
    ["src/app/api/invite/session/route.ts", "signing in with an invite code"],
    ["src/app/api/signup/route.ts", "signing up again with the same email"],
  ] as const;

  it.each(doors)("%s consults the lock, for %s", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    expect(source).toContain("isAccountBarred");
    // Reading the columns is the other half: a check on a field the query
    // never selected is undefined, and undefined reads as let in.
    expect(source).toContain("approvalStatus");
    expect(source).toContain("disabledAt");
  });

  /* The boards ask the listing question rather than the access one, so they
     read the disabled half through `listableTo` instead. */
  it("keeps the boards on the same two columns", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/accountListing.ts"), "utf8");
    expect(source).toContain("isAccountDisabled");
    expect(source).toContain("approvalStatus");
  });
});
