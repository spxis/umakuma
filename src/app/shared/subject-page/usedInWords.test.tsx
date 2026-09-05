import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { jishoSearchHref, type WordExample } from "@/lib/subjectPageModel";

import UsedInWordsBlock from "./UsedInWordsBlock";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

const growthBusiness: WordExample = {
  written: "成長事業",
  pronounced: "せいちょうじぎょう",
  gloss: "(high) growth business",
  kanji: [
    { label: "成", href: "/kanji/a", reading: "せい", meaning: "Become", level: 1, ukLevel: null, current: false },
    { label: "長", href: null, reading: "ちょう", meaning: "Long", level: 2, ukLevel: null, current: true },
    { label: "事", href: "/kanji/c", reading: "じ", meaning: "Occurrence", level: 3, ukLevel: null, current: false },
    { label: "業", href: "/kanji/d", reading: "ぎょう", meaning: "Business", level: 4, ukLevel: null, current: false },
  ],
};

const draw = (words: WordExample[]) =>
  new JSDOM(`<!doctype html><body>${renderToStaticMarkup(<UsedInWordsBlock words={words} />)}</body>`).window.document;

/*
 * A word shows every kanji it is made of.
 *
 * The kanji whose page you are on used to be dropped, on the grounds that a
 * link back to here does nothing - so 成長事業 drew three chips under a
 * four-character word and the reader counted them and found the maths wrong.
 * It is drawn like the others now, marked as the one you are on, and still
 * leads nowhere; it says so by being flat rather than by being absent.
 */
describe("used in words", () => {
  it("draws a chip for every kanji in the word, this one included", () => {
    const doc = draw([growthBusiness]);
    const chips = [...doc.querySelectorAll("li li")].map((node) => node.textContent ?? "");
    expect(chips).toHaveLength(4);
    expect(chips.join("")).toContain("長");
  });

  it("does not link the kanji whose page this is", () => {
    const doc = draw([growthBusiness]);
    const linked = [...doc.querySelectorAll("li li a")].map((a) => a.textContent ?? "");
    expect(linked).toHaveLength(3);
    expect(linked.join("")).not.toContain("長");
  });

  /*
   * The way out to Jisho. Hidden until the row is pointed at or the link takes
   * focus - `opacity-0`, never `hidden`, so a keyboard can still reach it.
   */
  it("offers the word on Jisho, in a new tab", () => {
    const doc = draw([growthBusiness]);
    const out = doc.querySelector('a[href^="https://jisho.org"]')!;
    expect(out.getAttribute("href")).toBe(jishoSearchHref("成長事業"));
    expect(out.getAttribute("target")).toBe("_blank");
    expect(out.getAttribute("rel")).toContain("noopener");
    expect(out.getAttribute("aria-label")).toBe(SUBJECT_PAGE_COPY.lookUpOnJisho("成長事業"));
  });

  it("keeps that link reachable without a pointer", () => {
    const doc = draw([growthBusiness]);
    const cls = doc.querySelector('a[href^="https://jisho.org"]')!.getAttribute("class") ?? "";
    expect(cls).toContain("opacity-0");
    expect(cls).toContain("group-hover:opacity-100");
    expect(cls).toContain("focus-visible:opacity-100");
    expect(cls).not.toContain("hidden");
  });

  it("encodes the word rather than pasting it into a URL", () => {
    expect(jishoSearchHref("成長事業")).toBe("https://jisho.org/search/%E6%88%90%E9%95%B7%E4%BA%8B%E6%A5%AD");
  });
});
