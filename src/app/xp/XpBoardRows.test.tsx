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

  /* Two members on 900 are both first, so nobody is second and the next is
     third - the placing after a tie skips. */
  it("shows the shared placing on a tie", () => {
    const places = [...draw({ isAdmin: false, address: null, accountId: null }).querySelectorAll("li")]
      .map((row) => row.querySelector("span")?.textContent);

    expect(places).toEqual(["#1", "#1", "#3"]);
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
