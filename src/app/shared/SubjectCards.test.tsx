import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SubjectCards from "./SubjectCards";
import { SUBJECT_TYPES, srsBucketFromStage } from "@/lib/domainConstants";

function row(glyph: string) {
  return {
    key: glyph,
    subjectId: 0,
    subjectType: SUBJECT_TYPES.kanji,
    glyph,
    meaning: "one",
    reading: null,
    wkLevel: null,
    srsStage: null,
    srsBucket: srsBucketFromStage(null),
  };
}

function draw(element: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(element)}</body>`).window.document;
}

/*
 * The stroke and grade browsers go to a character's own page; the explorers
 * open a panel over the current one. Both draw this card, so it has to be a
 * link for the first and a button for the second. A button in place of a link
 * costs middle-click, open-in-a-new-tab and the address on hover - which is
 * part of why three surfaces each drew their own card instead of sharing this.
 */
describe("what the card is, as an element", () => {
  it("is a button when the surface has nowhere to send you", () => {
    const doc = draw(<SubjectCards rows={[row("一")]} onSelect={() => undefined} />);
    expect(doc.querySelectorAll("li > button")).toHaveLength(1);
    expect(doc.querySelectorAll("li > a")).toHaveLength(0);
  });

  it("is a link when the surface gives it an address", () => {
    const doc = draw(
      <SubjectCards rows={[row("一")]} onSelect={() => undefined} hrefFor={() => "/kanji/x"} />,
    );
    const link = doc.querySelector("li > a");
    expect(link?.getAttribute("href")).toBe("/kanji/x");
    expect(doc.querySelectorAll("li > button")).toHaveLength(0);
  });

  /* Quiz mode is exactly this: a hidden card has no address, so it is a button. */
  it("falls back to a button when hrefFor declines this row", () => {
    const doc = draw(
      <SubjectCards rows={[row("一")]} onSelect={() => undefined} hrefFor={() => null} />,
    );
    expect(doc.querySelectorAll("li > button")).toHaveLength(1);
  });

  it("draws the same card either way", () => {
    const asButton = draw(<SubjectCards rows={[row("一")]} onSelect={() => undefined} />);
    const asLink = draw(
      <SubjectCards rows={[row("一")]} onSelect={() => undefined} hrefFor={() => "/kanji/x"} />,
    );
    const shell = (doc: Document) => doc.querySelector("li > *")?.getAttribute("class");
    expect(shell(asLink)).toBe(shell(asButton));
  });
});

describe("what a surface may add to the card", () => {
  it("takes a reading line and extra pills, so no page needs its own card", () => {
    const doc = draw(
      <SubjectCards
        rows={[row("一")]}
        onSelect={() => undefined}
        renderDetail={() => <span data-testid="reading">いち</span>}
        renderPills={() => <span data-testid="strokes">1 strokes</span>}
      />,
    );
    expect(doc.querySelector('[data-testid="reading"]')?.textContent).toBe("いち");
    expect(doc.querySelector('[data-testid="strokes"]')?.textContent).toBe("1 strokes");
  });

  /*
   * A control inside the card's own control is the failure UnifiedExplorerCard
   * was rebuilt to stop, on 428 nodes. The corner is a sibling of the card, so
   * a button placed there never lands inside one.
   */
  it("keeps a corner control outside the card's own control", () => {
    const doc = draw(
      <SubjectCards
        rows={[row("一")]}
        onSelect={() => undefined}
        renderCorner={() => <button type="button">stroke order</button>}
      />,
    );
    for (const nested of doc.querySelectorAll("button button, a button, button a")) {
      expect.unreachable(`nested control: ${nested.outerHTML.slice(0, 80)}`);
    }
    expect(doc.querySelectorAll("button")).toHaveLength(2);
  });

  it("lets a surface pack the grid tighter without changing the card", () => {
    const dense = draw(
      <SubjectCards rows={[row("一")]} onSelect={() => undefined} gridClassName="gap-2 grid-cols-6" />,
    );
    expect(dense.querySelector("ul")?.getAttribute("class")).toContain("grid-cols-6");
  });
});

/*
 * Every card in a row is the same height, which means the meaning gets one
 * line however long it is.
 *
 * It had two, so "katakana no radical (no. 4)" stood taller than the seven
 * cards beside it and the filing rail under each one sat at a different
 * height across the row. John, on the stroke pages: "Kanji blocks grow in
 * height! also we should probably force text to NOT wrap. use ellipsis and
 * then title tag to show entire text."
 */
describe("the meaning is one line, and nothing is lost to clipping it", () => {
  const longMeaning = { ...row("丿"), meaning: "katakana no radical (no. 4)" };

  it("clips rather than wrapping", () => {
    const doc = draw(<SubjectCards rows={[longMeaning]} onSelect={() => undefined} />);
    const meaning = [...doc.querySelectorAll("span")].find(
      (span) => span.textContent === longMeaning.meaning,
    );
    expect(meaning?.className).toContain("truncate");
    expect(meaning?.className).not.toContain("line-clamp");
  });

  it("keeps the whole meaning on the title, so the clip costs nothing", () => {
    const doc = draw(<SubjectCards rows={[longMeaning]} onSelect={() => undefined} />);
    const meaning = [...doc.querySelectorAll("span")].find(
      (span) => span.textContent === longMeaning.meaning,
    );
    expect(meaning?.getAttribute("title")).toBe(longMeaning.meaning);
  });

  /* A card with no meaning shows the stand-in and must not offer a tooltip
     that repeats it - a title saying the same words twice is noise. */
  it("offers no title when there is no meaning to show", () => {
    const doc = draw(<SubjectCards rows={[{ ...row("丿"), meaning: "" }]} onSelect={() => undefined} />);
    const withTitle = [...doc.querySelectorAll("span[title]")];
    expect(withTitle).toHaveLength(0);
  });
});
