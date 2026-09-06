import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import XpBoardRows from "./XpBoardRows";
import { rankXpBoard, type XpBoardAccount } from "./lib/xpBoard";

const ACCOUNTS: XpBoardAccount[] = [
  { id: "a", slug: "ada", nickname: null, displayName: "Ada", wkUsername: null, xp: 900 },
  { id: "b", slug: "bo", nickname: null, displayName: "Bo", wkUsername: null, xp: 900 },
  { id: "c", slug: "cai", nickname: null, displayName: "Cai", wkUsername: null, xp: 0 },
];

function draw(viewer: { isAdmin: boolean; address: string | null; accountId: string | null }): Document {
  const markup = renderToStaticMarkup(
    <XpBoardRows entries={rankXpBoard(ACCOUNTS)} viewer={viewer} />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("the XP board", () => {
  it("draws a row for every member, including one with no XP at all", () => {
    const rows = draw({ isAdmin: false, address: null, accountId: null }).querySelectorAll("li");

    expect(rows).toHaveLength(3);
    expect(rows[2].textContent).toContain("Cai");
    expect(rows[2].textContent).toContain("0 XP");
  });

  /*
   * Two members on 900 are both first, so nobody is second and the next is
   * third - the placing after a tie skips. The repeat prints NO NUMBER, the
   * way SPX drew it: `#1` twice down a column reads as a numbering bug rather
   * than as a shared place.
   */
  it("prints the place once for a tie and skips the next placing", () => {
    const places = [...draw({ isAdmin: false, address: null, accountId: null }).querySelectorAll("li")]
      .map((row) => row.querySelector("span")?.textContent?.trim());

    expect(places).toEqual(["#1", "Joint 1", "#3"]);
  });

  /* The blank is only blank to the eye. A screen reader cannot see that the
     empty cell belongs to the row above, so the place is still announced. */
  it("announces the shared place it does not print", () => {
    const second = draw({ isAdmin: false, address: null, accountId: null }).querySelectorAll("li")[1]!;
    const hidden = second.querySelector("span .sr-only");

    expect(hidden?.textContent).toBe("Joint 1");
    expect(second.querySelector("span")?.textContent).not.toContain("#");
  });

  /*
   * The distance to the row above, which is the whole reason a member reads a
   * board they are not winning. Three different facts, drawn three ways: the
   * leader has nobody above, a tied row needs the next point to break it, and
   * everybody else gets a number.
   */
  it("says what it would take to pass the row above", () => {
    const rows = [...draw({ isAdmin: false, address: null, accountId: null }).querySelectorAll("li")]
      .map((row) => row.textContent ?? "");

    expect(rows[0]).toContain("Leading");
    expect(rows[1]).toContain("Tied");
    expect(rows[2]).toContain("900 XP to pass");
  });

  it("links a viewer to their own row and to nobody else's", () => {
    const links = draw({ isAdmin: false, address: "ada", accountId: "a" }).querySelectorAll("a");

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/users/ada/xp");
  });

  it("links every row for an admin", () => {
    expect(draw({ isAdmin: true, address: null, accountId: null }).querySelectorAll("a")).toHaveLength(3);
  });

  /* A control never contains another control: a row is a plain `li` with a
     link inside it, never a button wrapping one. */
  it("nests no interactive element inside another", () => {
    const document = draw({ isAdmin: true, address: "ada", accountId: "a" });

    for (const control of document.querySelectorAll("a, button, [role='button']")) {
      expect(control.querySelector("a, button, [role='button']")).toBeNull();
    }
  });
});
