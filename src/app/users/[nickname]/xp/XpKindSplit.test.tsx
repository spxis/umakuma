import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import XpKindSplit from "./XpKindSplit";

const BY_KIND = [
  { kind: "placementAward", label: "Placement Award", amount: 250, share: 0.326 },
  { kind: "reviewAnswered", label: "Review Answered", amount: 229, share: 0.299 },
  { kind: "dailySignIn", label: "Daily Sign In", amount: 40, share: 0.052 },
];

function draw(byKind: typeof BY_KIND): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(<XpKindSplit byKind={byKind} />)}</body>`).window
    .document;
}

/*
 * Lifted out of the XP history page when the profile needed the same list.
 * Two surfaces answering "what have I been paid for" with two sets of bars
 * would have drifted on the first change to either.
 */
describe("where the XP came from", () => {
  it("draws a row per source, biggest first as it was given", () => {
    const rows = draw(BY_KIND).querySelectorAll("li");

    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Placement Award");
    expect(rows[2]!.textContent).toContain("Daily Sign In");
  });

  /* The bar is the share, and a screen reader is given the number rather than
     left with a decorative span. */
  it("tells a screen reader the share as a percentage", () => {
    const bars = draw(BY_KIND).querySelectorAll('[role="progressbar"]');

    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("33");
    expect(bars[0]!.getAttribute("aria-label")).toBe("Placement Award");
  });

  /* Nothing rather than an empty frame: the caller draws the heading, so an
     empty list here would leave a title over a blank. */
  it("draws nothing at all when there is nothing to split", () => {
    expect(renderToStaticMarkup(<XpKindSplit byKind={[]} />)).toBe("");
  });
});
