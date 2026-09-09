import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import XpBoardRows from "./XpBoardRows";
import { rankXpBoard, type XpBoardAccount } from "./lib/xpBoard";
import { xpStanding } from "@/lib/xp/xpCurve";
import { xpRankName } from "@/lib/xp/xpRanks";

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

/*
 * Links to a member's own pages, not every link on the row. Each row also
 * carries a link on its rank name now, so counting every anchor would answer
 * a different question than "who may open whose pages".
 */
function memberLinks(document: Document): HTMLAnchorElement[] {
  return [...document.querySelectorAll("a")].filter((link) =>
    link.getAttribute("href")?.startsWith("/users/"),
  ) as HTMLAnchorElement[];
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
    const links = memberLinks(draw({ isAdmin: false, address: "ada", accountId: "a" }));

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/users/ada/xp");
  });

  it("links every row for an admin", () => {
    expect(memberLinks(draw({ isAdmin: true, address: null, accountId: null }))).toHaveLength(3);
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

/*
 * The two numbers a board owes a reader, which is what turns it from a list
 * into a target: how far to the member above, and how far to the next rank.
 * The gap-to-the-row-above has been there since the shared board was written;
 * `toNext` was computed on every standing and printed nowhere.
 */
describe("both distances, on every row", () => {
  it("says how much XP the next rank still wants", () => {
    const text = draw({ isAdmin: false, address: null, accountId: null }).body.textContent ?? "";
    const standing = xpStanding(900);

    expect(standing.toNext).toBeGreaterThan(0);
    expect(text).toContain(`${standing.toNext.toLocaleString()} XP to ${xpRankName(standing.level + 1)}`);
  });

  /* Accumulated-so-far stays: it says where a member has been, and the new
     figure says what is left. Losing either turns two facts back into one. */
  it("keeps the distance already travelled beside it", () => {
    const text = draw({ isAdmin: false, address: null, accountId: null }).body.textContent ?? "";
    const standing = xpStanding(900);

    expect(text).toContain(`${standing.into.toLocaleString()} / ${standing.span.toLocaleString()} XP`);
  });

  /* There is no next rank at the top, and "0 XP to nothing" is worse than
     silence. */
  it("says nothing about a next rank to somebody at the top", () => {
    const top = renderToStaticMarkup(
      <XpBoardRows
        entries={rankXpBoard([
          { id: "z", slug: "zed", nickname: null, displayName: "Zed", wkUsername: null, xp: 10_000_000 },
        ])}
        viewer={{ isAdmin: false, address: null, accountId: null }}
      />,
    );

    expect(top).not.toContain("XP to ");
  });
});
