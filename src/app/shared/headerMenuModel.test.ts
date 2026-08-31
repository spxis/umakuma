import { describe, expect, it } from "vitest";

import { buildHeaderMenu } from "./headerMenuModel";
import { TOP_NAV_SECTIONS } from "./navSections";
import {
  ADMIN_WORKSPACE_TABS,
  ADMIN_WORKSPACE_TAB_LABELS,
} from "@/app/admin/AdminWorkspaceTabs";

const menu = (overrides = {}) =>
  buildHeaderMenu({ username: "jay", isAdmin: false, showAdminActions: false, ...overrides });

describe("buildHeaderMenu", () => {
  /*
   * The bug this model exists to prevent. The menu used to keep its own flat
   * list of links beside the header's grouped one, and the two drifted:
   * Practice and Profile were in the header and missing from the menu. Deriving
   * one from the other makes that impossible rather than merely fixed.
   */
  it("offers every page the header does, with nothing missing", () => {
    const navigable = menu().navigate.flatMap((section) => section.links.map((link) => link.label));
    const expected = TOP_NAV_SECTIONS.flatMap((section) => section.children.map((child) => child.label));

    expect(navigable).toEqual(expected);
    expect(navigable).toContain("Practice");
  });

  it("keeps the header's grouping instead of flattening it", () => {
    const explore = menu().navigate.find((section) => section.label === "Explore");
    expect(explore?.links.length).toBeGreaterThan(1);
  });

  it("puts Profile under settings, where the account lives", () => {
    expect(menu().settings.map((link) => link.label)).toContain("Profile");
    expect(menu().settings.map((link) => link.label)).toContain("Libraries");
  });

  // Settings moved out of the header, so it must not come back as a nav group.
  it("does not list settings as somewhere to navigate", () => {
    expect(menu().navigate.map((section) => section.label)).not.toContain("Settings");
  });

  it("scopes every member link to the viewer", () => {
    const hrefs = [...menu().account, ...menu().settings].map((link) => link.href);
    expect(hrefs.every((href) => href.startsWith("/users/jay"))).toBe(true);
  });

  it("encodes a username that needs it", () => {
    expect(menu({ username: "a b" }).account[0]?.href).toBe("/users/a%20b");
  });

  describe("admin", () => {
    it("shows nothing to a member", () => {
      expect(menu().admin).toEqual([]);
    });

    /*
     * The menu carried two hand-written links, "Admin" and "Manage users",
     * while admin had nine pages - so seven of them existed only for somebody
     * who already knew the header was there. It reads the same registry the
     * admin header reads, which is what stops the two drifting apart again.
     */
    it("offers every admin page, from the registry the admin header uses", () => {
      const labels = menu({ isAdmin: true }).admin.map((link) => link.label);
      expect(labels).toEqual(ADMIN_WORKSPACE_TABS.map((tab) => ADMIN_WORKSPACE_TAB_LABELS[tab]));
      expect(labels.length).toBeGreaterThan(2);
      // Reached either way in: being an admin, or being handed admin actions.
      expect(menu({ showAdminActions: true }).admin.map((link) => link.label)).toEqual(labels);
    });

    it("points every admin link at a real route", () => {
      for (const link of menu({ isAdmin: true }).admin) {
        expect(link.href, link.label).toMatch(/^\/admin/);
      }
    });
  });

  describe("a viewer with no account", () => {
    /*
     * Member links would all point at pages they cannot open. The header had
     * this fixed already; the menu needs the same, or it offers a signed-in
     * stranger a list of doors that all lead to /join.
     */
    it("is offered no member pages at all", () => {
      const empty = menu({ username: null });
      expect(empty.account).toEqual([]);
      expect(empty.settings).toEqual([]);
      expect(empty.navigate).toEqual([]);
    });

    it("still reaches admin when they are one", () => {
      expect(menu({ username: null, isAdmin: true }).admin.map((link) => link.label)).toEqual(
        ADMIN_WORKSPACE_TABS.map((tab) => ADMIN_WORKSPACE_TAB_LABELS[tab]),
      );
    });
  });
});
