import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CONFUSABLE_SOURCES } from "@/lib/kanjiConfusables";
import type { ConfusableView } from "@/lib/kanjiConfusablesView";

import ConfusablesBlock from "./ConfusablesBlock";
import { KANJI_SECTION_BLOCKS } from "@/app/kanji/[character]/kanjiSections";
import { SUBJECT_SECTIONS } from "./subjectSectionAddress";

function draw(items: ConfusableView[]): Document {
  return new JSDOM(
    `<!doctype html><body>${renderToStaticMarkup(<ConfusablesBlock items={items} />)}</body>`,
  ).window.document;
}

const EARTH: ConfusableView = {
  kanji: "士",
  meaning: "gentleman",
  reading: "シ",
  href: "/kanji/%E5%A3%AB",
  ukLevel: 52,
  sources: [CONFUSABLE_SOURCES.strokeEditDistance, CONFUSABLE_SOURCES.wanikani],
};

describe("the look-alike block", () => {
  it("draws each twin as a link to its own page", () => {
    const links = [...draw([EARTH]).querySelectorAll("a[href^='/kanji']")];
    expect(links).toHaveLength(1);
    expect(links[0]!.textContent).toContain("士");
  });

  /* The point of the block: the member is told where they met the twin. */
  it("says which level teaches the twin, in our own numbering", () => {
    expect(draw([EARTH]).body.textContent).toContain("UN52");
  });

  it("names both holders when both fed the list", () => {
    const text = draw([EARTH]).body.textContent ?? "";
    expect(text).toContain("Look-alike distances from");
    expect(text).toContain("Look-alike pairs from");
  });

  /* And only the one that did, so a page never credits a source it did not use. */
  it("names one holder when only one fed it", () => {
    const text =
      draw([{ ...EARTH, sources: [CONFUSABLE_SOURCES.wanikani] }]).body.textContent ?? "";
    expect(text).toContain("Look-alike pairs from");
    expect(text).not.toContain("Look-alike distances from");
  });

  it("draws nothing at all for a character with no twin", () => {
    expect(draw([]).body.textContent).toBe("");
  });
});

describe("where it sits on the page", () => {
  const order = KANJI_SECTION_BLOCKS.map((block) => block.id);

  /*
   * After Related, which stays beside Written with: John asked for those two
   * to be adjacent and `kanjiSectionOrder.test.ts` keeps them that way.
   */
  it("follows Related and comes before the mnemonics", () => {
    expect(order.indexOf(SUBJECT_SECTIONS.confusables)).toBe(order.indexOf(SUBJECT_SECTIONS.related) + 1);
    expect(order.indexOf(SUBJECT_SECTIONS.confusables)).toBeLessThan(order.indexOf(SUBJECT_SECTIONS.mnemonics));
  });
});
