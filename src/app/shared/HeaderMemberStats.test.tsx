import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WANIKANI_BOARD_HREF } from "@/app/leaderboard/lib/leaderboardAddress";
import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

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
    ladderStream: LADDER_STREAMS.un,
    ladderLevel: 23,
    wkLevel: 17,
    themeId: "samurai",
    themeName: "Samurai",
    isAdmin: false,
    ...overrides,
  };
}

function hrefs(document: Document): string[] {
  return [...document.querySelectorAll("a")].map((link) => link.getAttribute("href") ?? "");
}

function draw(viewerMenuInfo: ViewerMenuInfo | null): Document {
  const markup = renderToStaticMarkup(<HeaderMemberStats viewerMenuInfo={viewerMenuInfo} />);
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("the header's member strip", () => {
  it("draws XP and both ladders for a member", () => {
    const text = draw(viewer()).body.textContent ?? "";

    expect(text).toContain("1,240 XP");
    expect(text).toContain("UN23");
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
    const document = draw(
      viewer({
        xp: null,
        ladderStream: null,
        ladderLevel: null,
        wkLevel: null,
        accountId: null,
        themeId: null,
        themeName: null,
      }),
    );

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
    expect(text).toContain("UN23");
    expect(text).not.toContain("WK");
  });

  it("sends the XP figure to the viewer's own history, not the page's owner", () => {
    const link = draw(viewer({ slug: "testkuma" })).querySelector("a");

    expect(link?.getAttribute("href")).toBe("/users/testkuma/xp");
  });

  /*
   * The theme was put here to be a door. It is the one entry in the strip that
   * is a name rather than a number, and the name alone answers nothing - so
   * unlike XP it is drawn only when there is a page to send them to.
   */
  it("sends the theme to the viewer's own theme page", () => {
    const links = [...draw(viewer()).querySelectorAll("a")];
    const theme = links.find((link) => link.getAttribute("href")?.endsWith("/theme"));

    expect(theme?.getAttribute("href")).toBe("/users/testkuma/theme");
    expect(theme?.textContent).toBe("Samurai");
  });

  it("leaves the theme out when there is nowhere to send them", () => {
    const document = draw(viewer({ slug: null, wkUsername: null }));

    expect(document.body.textContent).not.toContain("Samurai");
  });

  /*
   * An account with no address yet has nowhere of its *own* to send them, so
   * XP goes plain and the theme is left out. Neither board is theirs - both
   * are the household's - so both survive an addressless viewer, which is the
   * line this test is really drawing.
   */
  it("draws XP as plain text when the viewer has no address", () => {
    const document = draw(viewer({ slug: null, wkUsername: null }));

    expect(hrefs(document)).toEqual(["/ladder/un", WANIKANI_BOARD_HREF]);
    expect(document.body.textContent).toContain("1,240 XP");
  });

  /*
   * The reason this ticket existed. Both numbers named a board that had no way
   * in from the header, so the boards were reachable only by typing them.
   */
  it("opens the UmaKuma board for the path the member is on", () => {
    const un = draw(viewer()).querySelector('a[href^="/ladder"]');
    const ug = draw(viewer({ ladderStream: LADDER_STREAMS.ug })).querySelector('a[href^="/ladder"]');

    expect(un?.getAttribute("href")).toBe("/ladder/un");
    expect(ug?.getAttribute("href")).toBe("/ladder/ug");
  });

  it("opens the WaniKani board from the WaniKani level", () => {
    const link = [...draw(viewer()).querySelectorAll("a")].find((a) => a.textContent === "WK17");

    expect(link?.getAttribute("href")).toBe(WANIKANI_BOARD_HREF);
  });

  /*
   * A UG member reading `UN23` is being shown a standing on a ladder they are
   * not taught against, under the prefix of the one they are. The badge and
   * the board it opens come from the same answer, so a wrong prefix would also
   * be a wrong destination.
   */
  it("names the school-year path for a member on it, and never the other one", () => {
    const text = draw(viewer({ ladderStream: LADDER_STREAMS.ug, ladderLevel: 23 })).body.textContent ?? "";

    expect(text).toContain("UG23");
    expect(text).not.toContain("UN");
  });

  /* Nothing to link to, and nothing to print: a member yet to start the curriculum. */
  it("leaves the UmaKuma level out for a member who has no standing", () => {
    const document = draw(viewer({ ladderLevel: null }));

    expect(document.body.textContent).not.toContain("UN");
    expect(hrefs(document).some((href) => href.startsWith("/ladder"))).toBe(false);
  });
});
