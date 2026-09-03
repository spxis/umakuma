import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "@/lib/domainConstants";

import SubjectPill from "./SubjectPill";

function draw(element: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(element)}</body>`).window.document;
}

/*
 * The one chip. Four surfaces drew their own before this was the only one -
 * a tile with corner badges, a bare box, a token with a cross - so what they
 * needed from it is what it is tested for here.
 */
describe("the pill, as an element", () => {
  it("is a link, a button, or plain text, by what it is given", () => {
    expect(draw(<SubjectPill glyph="山" href="/kanji/x" />).querySelector("a")?.getAttribute("href")).toBe("/kanji/x");
    expect(draw(<SubjectPill glyph="山" onClick={() => undefined} />).querySelector("button")).not.toBeNull();
    expect(draw(<SubjectPill glyph="山" />).querySelector("a, button")).toBeNull();
  });

  it("marks only Japanese as Japanese", () => {
    expect(draw(<SubjectPill glyph="山" />).querySelector("span[lang='ja']")).not.toBeNull();
    expect(draw(<SubjectPill glyph="leaf" subjectType={SUBJECT_TYPES.radical} />).querySelector("span[lang]")).toBeNull();
  });

  it("puts the words in the title, so hiding them costs a hover", () => {
    const link = draw(<SubjectPill glyph="山" reading="やま" meaning="mountain" href="/kanji/x" />).querySelector("a");
    expect(link?.getAttribute("title")).toBe("やま · mountain");
    expect(link?.textContent).toContain("やま · mountain");
  });
});

describe("what a surface may put on it", () => {
  it("carries the member's success rate and level as marks of their own", () => {
    const text = draw(<SubjectPill glyph="山" level={3} successRate={87.4} />).body.textContent ?? "";
    expect(text).toContain("87%");
    expect(text).toContain("L3");
  });

  it("carries neither mark when the surface knows neither", () => {
    const text = draw(<SubjectPill glyph="山" reading="やま" />).body.textContent ?? "";
    expect(text).not.toMatch(/L\d|%/);
  });

  it("says which one is on screen", () => {
    const button = draw(<SubjectPill glyph="山" onClick={() => undefined} selected />).querySelector("button");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.getAttribute("class")).toContain("ring-2");
  });

  it("takes a trailing mark inside the same control", () => {
    const doc = draw(<SubjectPill glyph="山" onClick={() => undefined} trailing={<span data-testid="x">×</span>} />);
    expect(doc.querySelector("button [data-testid='x']")).not.toBeNull();
  });
});
