import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import UnifiedExplorerCard from "./UnifiedExplorerCard";

/**
 * A control may not contain another control.
 *
 * `UnifiedExplorerCard` was a `role="button"` with a tabIndex, and it holds
 * controls of its own - trouble, favourite, the bulk-mode checkbox. That is
 * `nested-interactive`, and it failed on 428 nodes because every card on every
 * explorer counts once. The cost is not theoretical: a screen reader announces
 * the card as one button and never reaches the favourite inside it, and a
 * keyboard user arrives at the card with no way into its contents.
 *
 * Written against the rendered DOM rather than the source, because the defect
 * is a containment relationship and only the tree can be asked about it. A
 * source check would have to guess which JSX ends up inside which element,
 * which is the same guess that let this through in the first place.
 */

/** What axe counts as interactive for the `nested-interactive` rule. */
const INTERACTIVE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
  "[role='button']",
  "[role='checkbox']",
  "[role='link']",
  "[role='switch']",
  "[role='menuitem']",
  "[role='tab']",
].join(",");

function render(node: Parameters<typeof renderToStaticMarkup>[0]): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
}

function nestedControls(doc: Document): string[] {
  return [...doc.querySelectorAll(INTERACTIVE)]
    .filter((el) => el.parentElement?.closest(INTERACTIVE))
    .map((el) => {
      const outer = el.parentElement?.closest(INTERACTIVE);
      return `<${outer?.tagName.toLowerCase()}> contains <${el.tagName.toLowerCase()}>`;
    });
}

/*
 * The three explorers between them put a checkbox in the index and tag buttons
 * in the overlay, which are the two places a control actually lands.
 */
function card(density: "grid" | "list", extras: { choosing?: boolean } = {}) {
  return (
    <UnifiedExplorerCard
      density={density}
      onClick={() => {}}
      className="rounded-2xl border p-3"
      indexLabel={
        extras.choosing ? (
          <span>
            <input type="checkbox" readOnly checked={false} aria-label="Select 水" />
            {"#1"}
          </span>
        ) : (
          "#1"
        )
      }
      topRight={<span className="subject-pill">N5</span>}
      glyphClassName="border-kanji/50"
      glyphText="水"
      glyphTextClassName="text-6xl"
      glyphSubtitle="water"
      glyphOverlay={
        <div className="absolute inset-x-1 bottom-1">
          <button type="button" aria-label="Toggle trouble">
            !
          </button>
          <button type="button" aria-label="Toggle favourite">
            ★
          </button>
        </div>
      }
      statusChip={<span />}
      rightChip={<span />}
    />
  );
}

describe("a card that holds controls", () => {
  it.each(["grid", "list"] as const)("nests no control inside another (%s)", (density) => {
    expect(nestedControls(render(card(density)))).toEqual([]);
  });

  it.each(["grid", "list"] as const)("nests nothing while choosing either (%s)", (density) => {
    expect(nestedControls(render(card(density, { choosing: true })))).toEqual([]);
  });

  /*
   * The point of the exercise. Before, one control answered for the whole card
   * and the three inside it were unreachable.
   */
  it.each(["grid", "list"] as const)("reaches every control on its own (%s)", (density) => {
    const doc = render(card(density, { choosing: true }));
    const labels = [...doc.querySelectorAll(INTERACTIVE)].map(
      (el) => el.getAttribute("aria-label") ?? el.textContent?.trim(),
    );

    expect(labels).toContain("Toggle trouble");
    expect(labels).toContain("Toggle favourite");
    expect(labels).toContain("Select 水");
  });

  /*
   * The glyph is the control, so it carries the name a reader needs - the
   * character and what it means, not the pills stacked around it.
   */
  it.each(["grid", "list"] as const)("makes the glyph the button (%s)", (density) => {
    const glyph = render(card(density)).querySelector("[data-explorer-glyph-hitbox='true']");

    expect(glyph?.tagName.toLowerCase()).toBe("button");
    expect(glyph?.textContent).toContain("水");
    expect(glyph?.textContent).toContain("water");
  });

  /*
   * The container may still take a mouse click - that is worth keeping - but it
   * must not claim to be a control, or the nesting is back.
   */
  it("leaves the container a plain element", () => {
    const container = render(card("grid")).querySelector(".group\\/explorer-card");

    expect(container?.getAttribute("role")).toBeNull();
    expect(container?.getAttribute("tabindex")).toBeNull();
  });

  /* Chosen is state of the glyph control now, and has to still be announced. */
  it("announces a chosen card on the control that chose it", () => {
    const markup = renderToStaticMarkup(
      <UnifiedExplorerCard
        chosen
        onClick={() => {}}
        className=""
        indexLabel="#1"
        topRight={null}
        glyphClassName=""
        glyphText="水"
        glyphTextClassName=""
        statusChip={<span />}
        rightChip={<span />}
      />,
    );
    const doc = new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;

    expect(doc.querySelector("[data-explorer-glyph-hitbox='true']")?.getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
