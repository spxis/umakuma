import { describe, expect, it } from "vitest";

import { canViewUserPage } from "./userPageAuth";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

function viewer(overrides: Partial<ViewerMenuInfo> = {}): ViewerMenuInfo {
  return {
    provider: "google",
    name: "Someone",
    email: "someone@example.com",
    wkUsername: null,
    slug: null,
    accountId: null,
    hasWanikani: false,
    internal: false,
    xp: null,
    unLevel: null,
    wkLevel: null,
    themeId: null,
    themeName: null,
    isAdmin: false,
    ...overrides,
  };
}

/**
 * The page gate. resolveViewerMenuInfo (the database half) resolves a viewer
 * to an account by linked email only - the display-name fallback that handed
 * a stranger named "Jay" the account nicknamed Jay is gone, and these tests
 * pin the gate that consumes its result.
 */
describe("canViewUserPage", () => {
  /*
   * The gate used to compare WaniKani usernames only. An account that signed
   * in with Google and never connected WaniKani has none, so the viewer side
   * resolved to null and the member was redirected off every page they own -
   * including their own profile, while their API calls kept working.
   */
  it("lets a member with no WaniKani reach their own pages by slug", () => {
    expect(
      canViewUserPage({
        viewerEmail: "gwen@example.com",
        viewerMenuInfo: viewer({ wkUsername: null, slug: "gwen-hale" }),
        targetWkUsername: "",
        targetSlug: "gwen-hale",
      }),
    ).toBe(true);
  });

  it("still turns away a different member with no WaniKani", () => {
    expect(
      canViewUserPage({
        viewerEmail: "gwen@example.com",
        viewerMenuInfo: viewer({ wkUsername: null, slug: "gwen-hale" }),
        targetWkUsername: "",
        targetSlug: "owen-chen",
      }),
    ).toBe(false);
  });

  // Two accounts with no slug must not match each other on a pair of nulls.
  it("does not treat two missing addresses as the same member", () => {
    expect(
      canViewUserPage({
        viewerEmail: "gwen@example.com",
        viewerMenuInfo: viewer({ wkUsername: null, slug: null }),
        targetWkUsername: "",
        targetSlug: null,
      }),
    ).toBe(false);
  });

  it("keeps matching a link shared before slugs existed", () => {
    expect(
      canViewUserPage({
        viewerEmail: "john@example.com",
        viewerMenuInfo: viewer({ wkUsername: "johnmorrisdotca", slug: "johnmorrisdotca" }),
        targetWkUsername: "JohnMorrisDotCa",
        targetSlug: null,
      }),
    ).toBe(true);
  });

  it("lets a viewer see their own page", () => {
    expect(
      canViewUserPage({
        viewerEmail: "someone@example.com",
        viewerMenuInfo: viewer({ wkUsername: "JayMcInnes" }),
        targetWkUsername: "jaymcinnes",
      }),
    ).toBe(true);
  });

  it("refuses a viewer with no resolved WaniKani identity", () => {
    expect(
      canViewUserPage({
        viewerEmail: "someone@example.com",
        viewerMenuInfo: viewer({ wkUsername: null }),
        targetWkUsername: "jaymcinnes",
      }),
    ).toBe(false);
  });

  it("refuses a viewer resolved to a different account", () => {
    expect(
      canViewUserPage({
        viewerEmail: "someone@example.com",
        viewerMenuInfo: viewer({ wkUsername: "emimcinnes" }),
        targetWkUsername: "jaymcinnes",
      }),
    ).toBe(false);
  });

  it("refuses when there is no viewer at all", () => {
    expect(
      canViewUserPage({ viewerEmail: null, viewerMenuInfo: null, targetWkUsername: "jaymcinnes" }),
    ).toBe(false);
  });

  it("never treats an empty username pair as a match", () => {
    expect(
      canViewUserPage({
        viewerEmail: "someone@example.com",
        viewerMenuInfo: viewer({ wkUsername: "" }),
        targetWkUsername: "",
      }),
    ).toBe(false);
  });
});
