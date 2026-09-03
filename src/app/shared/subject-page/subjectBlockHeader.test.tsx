import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SubjectBlock from "./SubjectBlock";
import { SOURCE_KEYS } from "@/lib/sourceCredits";

function draw(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

/*
 * Stroke order drew its title in a header bar across the top of its card while
 * every other block put a small label inside its padded body, so one card on
 * the page read as a different component from the four beneath it. One header
 * for all of them, and the right-hand slot is the stroke panel's too - where
 * its stroke count sits, a block's own control sits.
 */
describe("a subject page block", () => {
  it("puts its title in a header bar, not inside the body", () => {
    const doc = draw(<SubjectBlock heading="Written with">body</SubjectBlock>);
    const header = doc.querySelector("section > header");
    expect(header?.querySelector("h2")?.textContent).toBe("Written with");
    expect(header?.getAttribute("class")).toContain("border-b");
  });

  it("gives a block's own control the same corner the stroke count uses", () => {
    const doc = draw(
      <SubjectBlock heading="Used in words" action={<button type="button">Text on</button>}>
        body
      </SubjectBlock>,
    );
    expect(doc.querySelector("section > header button")?.textContent).toBe("Text on");
    expect(doc.querySelectorAll("section > div button")).toHaveLength(0);
  });

  /* A block with nothing to title - the identity card - keeps its bare top. */
  it("draws no bar when there is no title and no control", () => {
    const doc = draw(<SubjectBlock>body</SubjectBlock>);
    expect(doc.querySelector("section > header")).toBeNull();
  });

  it("keeps the credit outside the padded body, under the whole card", () => {
    const doc = draw(
      <SubjectBlock heading="In use" credit={{ source: SOURCE_KEYS.tatoeba, label: "Sentences from" }}>
        body
      </SubjectBlock>,
    );
    expect(doc.body.textContent).toContain("Sentences from");
  });
});
