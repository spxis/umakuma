import { readFileSync } from "node:fs";
import { join } from "node:path";

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

/*
 * One chip, one size.
 *
 * The prop outlived the several chips it was made for. A kanji page stacks the
 * blocks: the kanji inside each compound under Used in words came out at
 * text-base, the radicals under Built from a block below at text-2xl, and both
 * are one item standing in a row of chips. Size was never a per-surface call,
 * and the small variant's other half - a narrower minimum width - lost to the
 * default in the stylesheet and had never once applied.
 */
describe("the size of it", () => {
  const glyphClass = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
    draw(element).querySelector("span[lang='ja']")?.getAttribute("class") ?? "";

  it("draws the glyph at one size, whatever the surface asks for", () => {
    expect(glyphClass(<SubjectPill glyph="山" />)).toContain("text-2xl");
    expect(glyphClass(<SubjectPill glyph="山" href="/kanji/x" />)).toBe(glyphClass(<SubjectPill glyph="山" />));
  });

  it("takes no size from a caller", () => {
    const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
    expect(read("src/app/shared/SubjectPill.tsx")).not.toContain("min-w-11");
    for (const caller of [
      "src/app/shared/SelectedItemsPanel.tsx",
      "src/app/shared/subject-page/UsedInWordsBlock.tsx",
      "src/app/shared/subject-page/RelatedGroupBlock.tsx",
      "src/app/users/[nickname]/lists/ImportFromTextButton.tsx",
      "src/app/users/[nickname]/lists/StudyListItemEditor.tsx",
      "src/app/users/[nickname]/lists/[slug]/ListSourceUpdates.tsx",
    ]) {
      expect(read(caller)).not.toContain('size="sm"');
    }
  });
});
