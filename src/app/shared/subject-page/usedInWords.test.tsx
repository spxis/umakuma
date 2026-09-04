import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { WordExample } from "@/lib/subjectPageModel";

import UsedInWordsBlock from "./UsedInWordsBlock";

const growthBusiness: WordExample = {
  written: "成長事業",
  pronounced: "せいちょうじぎょう",
  gloss: "(high) growth business",
  kanji: [
    { label: "成", href: "/kanji/a", reading: "せい", meaning: "Become", level: 1, current: false },
    { label: "長", href: null, reading: "ちょう", meaning: "Long", level: 2, current: true },
    { label: "事", href: "/kanji/c", reading: "じ", meaning: "Occurrence", level: 3, current: false },
    { label: "業", href: "/kanji/d", reading: "ぎょう", meaning: "Business", level: 4, current: false },
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

});
