import { describe, expect, it } from "vitest";

import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";

import { viewerAddress, viewsOwnPage } from "./viewerAddress";

/**
 * Ownership gates writing, not reading.
 *
 * Several surfaces are visible to more people than can change them - a page
 * you may look at is not a page you may save lists to. Getting this wrong
 * offers a visitor a button that writes to the page owner's account, which is
 * the kind of bug that looks like a feature until somebody uses it.
 */

function viewer(overrides: Partial<ViewerMenuInfo>): ViewerMenuInfo {
  return {
    provider: "google",
    name: "Jay",
    email: "jay@example.com",
    wkUsername: null,
    slug: null,
    accountId: null,
    isAdmin: false,
    ...overrides,
  };
}

describe("whose page this is", () => {
  it("recognises a member by their slug", () => {
    expect(viewsOwnPage(viewer({ slug: "jay" }), "jay")).toBe(true);
  });

  it("still recognises them on an old WaniKani-username link", () => {
    expect(viewsOwnPage(viewer({ slug: "jay", wkUsername: "jaymcinnes" }), "jaymcinnes")).toBe(true);
  });

  it("ignores case, since both forms appear in shared links", () => {
    expect(viewsOwnPage(viewer({ slug: "Jay" }), "jay")).toBe(true);
    expect(viewsOwnPage(viewer({ slug: "jay" }), "JAY")).toBe(true);
  });

  it("says no for somebody else's page", () => {
    expect(viewsOwnPage(viewer({ slug: "jay" }), "mika")).toBe(false);
  });

  it("says no for a signed-out visitor", () => {
    expect(viewsOwnPage(null, "jay")).toBe(false);
    expect(viewsOwnPage(undefined, "jay")).toBe(false);
  });

  it("does not match a viewer with no address to an empty page key", () => {
    // Two blanks are not the same person.
    expect(viewsOwnPage(viewer({}), "")).toBe(false);
    expect(viewsOwnPage(viewer({}), null)).toBe(false);
    expect(viewsOwnPage(viewer({ slug: "  " }), "  ")).toBe(false);
  });
});

describe("a viewer's own address", () => {
  it("prefers the slug and falls back to the WaniKani name", () => {
    expect(viewerAddress(viewer({ slug: "jay", wkUsername: "jaymcinnes" }))).toBe("jay");
    expect(viewerAddress(viewer({ wkUsername: "jaymcinnes" }))).toBe("jaymcinnes");
    expect(viewerAddress(viewer({}))).toBeNull();
  });
});
