import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = () => readFileSync(join(process.cwd(), "src/lib/useSearchCombobox.ts"), "utf8");

/*
 * Escape takes the search away, in the order a reader means it.
 *
 * A full box empties; an empty box goes. The second half was missing: it closed
 * the dropdown and stopped, leaving the field expanded with the cursor still in
 * it, so the thing somebody pressed Escape to be rid of was still on screen and
 * wider than before.
 *
 * The keyboard path is a handler on a React input; the assertions are against
 * the source because the alternative is standing up the whole combobox, its
 * suggestion fetch and its focus model to press one key. The two behaviours it
 * has to keep apart - clearing and dismissing - are visible here as two
 * branches, which is the part that regressed.
 */
describe("Escape in the search box", () => {
  it("clears a box that has something in it, and stops there", () => {
    const escape = source().slice(source().indexOf('if (event.key === "Escape" && typed.length > 0)'));
    expect(escape.slice(0, 200)).toContain("clear();");
    /* Stopped, so the phone sheet stays open while the query is being cleared. */
    expect(escape.slice(0, 200)).toContain("event.stopPropagation();");
  });

  it("gives up focus when the box is empty, which is what collapses it", () => {
    const text = source();
    const dismiss = text.slice(text.lastIndexOf('if (event.key === "Escape")'));
    expect(dismiss).toContain("closePanel();");
    expect(dismiss).toContain(".blur()");
  });

  /* The sheet should close with the box rather than outliving it. */
  it("lets the dismissing press reach the phone sheet", () => {
    const text = source();
    const dismiss = text.slice(text.lastIndexOf('if (event.key === "Escape")'));
    const body = dismiss.slice(0, dismiss.indexOf("}\n"));
    expect(body).not.toContain("stopPropagation");
  });

  /*
   * No longer gated on a panel being open. An empty box with the dropdown
   * already shut still has focus and still has to go.
   */
  it("does not wait for a panel to be open", () => {
    expect(source()).not.toContain('event.key === "Escape" && (panelVisible');
  });
});
