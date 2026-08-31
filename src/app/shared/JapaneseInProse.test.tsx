import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import JapaneseInProse from "./JapaneseInProse";
import { NO_TRANSLATE_CLASS } from "./japaneseText";

const render = (text: string) => renderToStaticMarkup(<JapaneseInProse text={text} />);

describe("Japanese quoted inside English prose", () => {
  /*
   * The release-note case. The sentence is English and somebody may reasonably
   * want it translated; the two Japanese words inside it are the two that have
   * to survive, because they are what the sentence is about.
   */
  it("marks the Japanese and leaves the English translatable", () => {
    const html = render("a reader knows 何 by なに before they know it by what");
    expect(html).toContain(`<span translate="no" class="${NO_TRANSLATE_CLASS}">何</span>`);
    expect(html).toContain(`<span translate="no" class="${NO_TRANSLATE_CLASS}">なに</span>`);
    // The English is not inside any marked span.
    expect(html).toContain("a reader knows ");
    expect(html).not.toContain(`${NO_TRANSLATE_CLASS}">a reader`);
  });

  it("keeps adjacent Japanese together rather than one span per character", () => {
    const html = render("札幌市 is Hokkaido's capital");
    expect(html).toContain(`>札幌市</span>`);
    expect((html.match(new RegExp(NO_TRANSLATE_CLASS, "g")) ?? []).length).toBe(1);
  });

  it("adds no wrapper at all to prose with no Japanese in it", () => {
    const html = render("The pager now sits at both ends of the sheet.");
    expect(html).not.toContain("span");
    expect(html).toBe("The pager now sits at both ends of the sheet.");
  });

  it("keeps the whole text, in order", () => {
    const text = "before 漢字 middle かな after";
    expect(render(text).replace(/<[^>]+>/g, "")).toBe(text);
  });

  it("handles Japanese at either end", () => {
    expect(render("東京 is the capital").replace(/<[^>]+>/g, "")).toBe("東京 is the capital");
    expect(render("the capital is 東京").replace(/<[^>]+>/g, "")).toBe("the capital is 東京");
  });
});
