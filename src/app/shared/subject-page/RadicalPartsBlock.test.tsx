import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RadicalPartsBlock from "./RadicalPartsBlock";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

function draw(element: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(element)}</body>`).window.document;
}

const parts = [
  { radical: "山", name: "mountain", strokes: 3, href: "/radicals?parts=%E5%B1%B1" },
  { radical: "一", name: null, strokes: 1, href: "/radicals?parts=%E4%B8%80" },
];

/*
 * The parts sit a scroll above the related groups, which are pills; for a
 * release the parts were a box of their own, and one page showed two chips.
 */
describe("the parts of a character", () => {
  it("are the shared pill, each linked into the radical search", () => {
    const doc = draw(<RadicalPartsBlock parts={parts} />);
    const links = [...doc.querySelectorAll("li > a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual(parts.map((part) => part.href));
    expect(links[0]?.textContent).toContain("mountain");
    expect(links[0]?.querySelector("span")?.getAttribute("class")).toContain("text-radical");
  });

  it("carries the one text control every row of pills has", () => {
    const doc = draw(<RadicalPartsBlock parts={parts} />);
    const labels = [...doc.querySelectorAll("button")].map((button) => button.textContent);
    expect(labels).toContain(SUBJECT_PAGE_COPY.pillTextOn);
  });

  it("draws nothing for a character with no parts", () => {
    expect(draw(<RadicalPartsBlock parts={[]} />).body.innerHTML).toBe("");
  });
});
