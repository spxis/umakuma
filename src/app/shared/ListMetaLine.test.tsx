import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ListMetaLine from "./ListMetaLine";

function text(node: Parameters<typeof renderToStaticMarkup>[0]): string {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document.body.textContent ?? "";
}

const HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

/**
 * What a list says about itself.
 *
 * The card said only when the list changed, so a reader deciding whether a
 * shared list was worth their time had nothing to go on.
 */
describe("ListMetaLine", () => {
  it("says how big a list is, and when it was made and changed", () => {
    const shown = text(<ListMetaLine facts={{ itemCount: 12, createdAt: HOUR_AGO, updatedAt: HOUR_AGO }} />);

    expect(shown).toContain("12 items");
    expect(shown).toContain("Made");
    expect(shown).toContain("Changed");
  });

  it("counts one item as one", () => {
    expect(text(<ListMetaLine facts={{ itemCount: 1 }} />)).toContain("1 item");
    expect(text(<ListMetaLine facts={{ itemCount: 1 }} />)).not.toContain("1 items");
  });

  /* A count of zero is a sentence about failure, so it is not a sentence. */
  it("leaves out what has not happened", () => {
    const shown = text(<ListMetaLine facts={{ itemCount: 3, copyCount: 0, shareCount: 0, subscriberCount: 0 }} />);

    expect(shown).not.toContain("copied");
    expect(shown).not.toContain("shared");
    expect(shown).not.toContain("following");
  });

  it("reads a single copy as once and several as times", () => {
    expect(text(<ListMetaLine facts={{ copyCount: 1 }} />)).toContain("copied once");
    expect(text(<ListMetaLine facts={{ copyCount: 4 }} />)).toContain("copied 4 times");
    expect(text(<ListMetaLine facts={{ shareCount: 2 }} />)).toContain("shared 2 times");
  });

  it("says who keeps a list without owning it", () => {
    expect(text(<ListMetaLine facts={{ subscriberCount: 3 }} />)).toContain("3 following");
  });

  it("names an owner where the surface knows one", () => {
    expect(text(<ListMetaLine facts={{ ownerName: "Yuki" }} />)).toContain("by Yuki");
  });

  /* Nothing to say means no line, not an empty one with stray separators. */
  it("draws nothing when it knows nothing", () => {
    const html = renderToStaticMarkup(<ListMetaLine facts={{}} />);

    expect(html).toBe("");
  });
});
