import { describe, expect, it } from "vitest";

import { DASHBOARD_TAB_LABELS } from "@/app/users/[nickname]/userReadConfig";

import { buildHeaderMenu } from "./headerMenuModel";
import { TOP_NAV_SECTIONS } from "./navSections";

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
    const learn = menu().navigate.find((section) => section.label === "Learn");
    expect(learn?.links.length).toBeGreaterThan(1);
  });

  it("puts Profile under settings, where the account lives", () => {
    expect(menu().settings.map((link) => link.label)).toContain("Profile");
    expect(menu().settings.map((link) => link.label)).toContain("Libraries");
  });

  /*
   * The welcome wizard tells anyone who skips WaniKani that they can connect
   * later. This is the only standing route to that page, so it is the sentence
   * that stops being true if the entry disappears.
   */
  it("offers the WaniKani connection under settings", () => {
    expect(menu().settings).toContainEqual({ label: "WaniKani", href: "/users/jay/wanikani" });
  });

  /*
   * The menu is a second copy of the header's sections, so it has to gate on
   * the same answer: offering the Library Explorer here to a member with no
   * WaniKani would put back exactly what the header stopped offering.
   */
  it("hides the WaniKani-only pages from a member with no connection", () => {
    const gated = menu({ access: { hasWanikani: false } });
    const links = gated.navigate.flatMap((section) => section.links.map((link) => link.label));
    expect(links).not.toContain(DASHBOARD_TAB_LABELS.wk);
    expect(links).not.toContain(DASHBOARD_TAB_LABELS.stats);
    expect(links).toContain(DASHBOARD_TAB_LABELS.jlpt);
    expect(gated.settings.map((link) => link.label)).toContain("WaniKani");
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
     * One entry. The menu listed every admin page - eleven of them - which was
     * a second copy of the admin workspace's own tab row, in a menu whose job
     * is the account. The workspace is one click away and its tab row is the
     * registry.
     */
    it("offers admin once, as a way into the workspace", () => {
      expect(menu({ isAdmin: true }).admin).toEqual([{ label: "Admin", href: "/admin" }]);
      // Reached either way in: being an admin, or being handed admin actions.
      expect(menu({ showAdminActions: true }).admin).toEqual(menu({ isAdmin: true }).admin);
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
      expect(menu({ username: null, isAdmin: true }).admin.map((link) => link.label)).toEqual(["Admin"]);
    });
  });
});
