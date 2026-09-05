import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";

import HeaderMemberStats from "./HeaderMemberStats";

function viewer(overrides: Partial<ViewerMenuInfo> = {}): ViewerMenuInfo {
  return {
    provider: "invite",
    name: "Testkuma",
    email: null,
    wkUsername: null,
    slug: "testkuma",
    accountId: "acc_1",
    hasWanikani: false,
    internal: true,
    xp: 1240,
    ukLevel: 23,
    wkLevel: 17,
    isAdmin: false,
    ...overrides,
  };
}

function draw(viewerMenuInfo: ViewerMenuInfo | null): Document {
  const markup = renderToStaticMarkup(<HeaderMemberStats viewerMenuInfo={viewerMenuInfo} />);
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("the header's member strip", () => {
  it("draws XP and both ladders for a member", () => {
    const text = draw(viewer()).body.textContent ?? "";

    expect(text).toContain("1,240 XP");
    expect(text).toContain("UK23");
    expect(text).toContain("WK17");
  });

  /*
   * The reason the strip may sit in the header at all. Two ladders on one line
   * are only safe while each says whose it is; a bare `23` beside a bare `17`
   * is two numbers and no question answered.
   */
  it("never draws a level without its ladder's prefix", () => {
    const text = draw(viewer()).body.textContent ?? "";

    expect(text).not.toMatch(/\bL23\b/);
    expect(text).not.toMatch(/\bL17\b/);
  });

  it("collapses to nothing for a signed-out visitor", () => {
    expect(draw(null).body.innerHTML).toBe("");
  });

  /*
   * A session whose account was turned away is a real session with no account
   * behind it. `resolveViewerMenuInfo` gives it a null xp, and the header has
   * to read that as "no account" rather than drawing a stranger a zero.
   */
  it("collapses to nothing for a signed-in non-member", () => {
    const document = draw(viewer({ xp: null, ukLevel: null, wkLevel: null, accountId: null }));

    expect(document.body.innerHTML).toBe("");
  });

  /* Nought XP is a fact about a member; no XP is the absence of one. */
  it("still draws a member who has earned no XP at all", () => {
    const text = draw(viewer({ xp: 0 })).body.textContent ?? "";

    expect(text).toContain("0 XP");
  });

  it("leaves WaniKani out for a member who has never connected one", () => {
    const text = draw(viewer({ wkLevel: null })).body.textContent ?? "";

    expect(text).toContain("1,240 XP");
    expect(text).toContain("UK23");
    expect(text).not.toContain("WK");
  });

  it("sends the XP figure to the viewer's own history, not the page's owner", () => {
    const link = draw(viewer({ slug: "testkuma" })).querySelector("a");

    expect(link?.getAttribute("href")).toBe("/users/testkuma/xp");
  });

  /* An account with no address yet has nowhere to send them; the number stays. */
  it("draws XP as plain text when the viewer has no address", () => {
    const document = draw(viewer({ slug: null, wkUsername: null }));

    expect(document.querySelector("a")).toBeNull();
    expect(document.body.textContent).toContain("1,240 XP");
  });
});
