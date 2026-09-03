import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SubjectGlyph from "./SubjectGlyph";
import { GLYPH_ROW_SIZE_CLASS } from "./glyphSizes";
import { SUBJECT_TYPES } from "@/lib/domainConstants";

function draw(element: Parameters<typeof renderToStaticMarkup>[0]): Element | null {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(element)}</body>`).window.document.querySelector("span");
}

/*
 * Five surfaces drew this by hand - study history, a saved list, recent items,
 * a page of search results, the suggestions under the search box - and the
 * copies aged apart. These are the two things a copy lost.
 */
describe("the glyph at the head of a row", () => {
  it("declares itself Japanese, which one copy had stopped doing", () => {
    const span = draw(<SubjectGlyph glyph="私自身" subjectType={SUBJECT_TYPES.vocabulary} />);
    /* Without it Chrome offers to translate 私自身 to "myself" and a screen
     * reader spells the kanji out in English. */
    expect(span?.getAttribute("lang")).toBe("ja");
    expect(span?.getAttribute("translate")).toBe("no");
  });

  it("is one size, whatever the surface", () => {
    const row = draw(<SubjectGlyph glyph="水" subjectType={SUBJECT_TYPES.kanji} laneClassName="w-16 shrink-0" />);
    const wider = draw(<SubjectGlyph glyph="水" subjectType={SUBJECT_TYPES.kanji} laneClassName="w-20 shrink-0 sm:w-30" />);
    expect(row?.getAttribute("class")).toContain(GLYPH_ROW_SIZE_CLASS);
    expect(wider?.getAttribute("class")).toContain(GLYPH_ROW_SIZE_CLASS);
    /* One of the five had grown an sm:text-3xl the others knew nothing about. */
    expect(wider?.getAttribute("class")).not.toMatch(/sm:text-/);
  });

  /* The lane is the surface's call, and the only thing it decides. */
  it("stands in the lane it is given", () => {
    expect(draw(<SubjectGlyph glyph="水" laneClassName="w-16 shrink-0" />)?.getAttribute("class")).toContain("w-16");
  });

  it("takes the colour of the kind of thing it is", () => {
    const radical = draw(<SubjectGlyph glyph="一" subjectType={SUBJECT_TYPES.radical} />);
    const kanji = draw(<SubjectGlyph glyph="一" subjectType={SUBJECT_TYPES.kanji} />);
    expect(radical?.getAttribute("class")).not.toBe(kanji?.getAttribute("class"));
    expect(draw(<SubjectGlyph glyph="一" tone="text-amber-600" />)?.getAttribute("class")).toContain("text-amber-600");
  });
});
