import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";
import SubjectSectionHeader from "./SubjectSectionHeader";
import { SUBJECT_SECTIONS } from "./subjectSectionAddress";

function draw(line: string | null = "りん · ethics"): Document {
  const markup = renderToStaticMarkup(
    <SubjectSectionHeader
      base="/kanji/%E5%80%AB"
      label="倫"
      line={line}
      section={SUBJECT_SECTIONS.related}
      available={[SUBJECT_SECTIONS.related, SUBJECT_SECTIONS.stroke, SUBJECT_SECTIONS.words]}
    />,
  );
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/*
 * A section page keeps one block, and that block is Related or Words or
 * Mnemonics - none of which says which character you are reading about. The
 * page opened on a bare underlined link and a row of chips.
 */
describe("the head of a section page", () => {
  it("says which subject the page is about, and which part of it", () => {
    const document = draw();
    expect(document.querySelector("h1")?.textContent).toBe("倫");
    expect(document.body.textContent).toContain(SUBJECT_PAGE_COPY.sectionTitles.related);
    expect(document.body.textContent).toContain("りん · ethics");
  });

  it("holds its shape for a subject with nothing known about it", () => {
    const document = draw(null);
    expect(document.querySelector("h1")?.textContent).toBe("倫");
  });

  /* The way back is a chip among the chips, not an anchor above them. */
  it("draws the way back like the rest of the row", () => {
    const links = [...draw().querySelectorAll("nav a")];
    const back = links[0]!;
    expect(back.getAttribute("href")).toBe("/kanji/%E5%80%AB");
    expect(back.textContent).toBe(SUBJECT_PAGE_COPY.sectionBack("倫"));
    expect(back.getAttribute("class")).toContain("rounded-full");
    for (const link of links) expect(link.getAttribute("class")).not.toContain("underline");
  });

  it("offers every other part, and never the one being read", () => {
    const labels = [...draw().querySelectorAll("nav a")].slice(1).map((node) => node.textContent);
    expect(labels).toEqual([
      SUBJECT_PAGE_COPY.sectionTitles.stroke,
      SUBJECT_PAGE_COPY.sectionTitles.words,
    ]);
    expect(labels).not.toContain(SUBJECT_PAGE_COPY.sectionTitles.related);
  });
});
