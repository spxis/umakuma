import { describe, expect, it } from "vitest";

import { canViewUserPage } from "./userPageAuth";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

function viewer(overrides: Partial<ViewerMenuInfo> = {}): ViewerMenuInfo {
  return {
    provider: "google",
    name: "Someone",
    email: "someone@example.com",
    wkUsername: null,
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
