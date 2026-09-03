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
