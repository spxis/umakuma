import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MODAL_LAYERS } from "./modalLayers";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** The number in a Tailwind z class: `z-20` and `z-[9991]` both. */
function layer(cls: string): number {
  const match = /z-\[?(\d+)\]?/.exec(cls);
  if (!match) throw new Error(`no z-index in "${cls}"`);
  return Number(match[1]);
}

/**
 * The open user menu drew under a list's sticky column headings.
 *
 * The panel itself sat at z-9991, which looked unbeatable - but its wrapper
 * was `relative z-10`, and a wrapper with any z-index starts a stacking
 * context, so the panel's layer only ordered it against its siblings inside
 * that context. Against the page, the whole menu was worth 10, and a heading
 * at 20 painted straight across it.
 */
describe("the header menu against page chrome", () => {
  it("anchors the menu from a named layer, not a number in the component", () => {
    const menu = read("src/app/users/[nickname]/UserHeaderMenu.tsx");
    expect(menu).toContain("MODAL_LAYERS.headerAnchor");
    expect(menu).not.toMatch(/className="relative z-\d+"/);
  });

  it("sits above every sticky heading a list can draw", () => {
    const rows = read("src/app/shared/SubjectRows.tsx");
    const stickies = [...rows.matchAll(/sticky [^"`]*?(z-\[?\d+\]?)/g)].map((match) => layer(match[1]!));
    expect(stickies.length).toBeGreaterThan(0);
    for (const sticky of stickies) expect(layer(MODAL_LAYERS.headerAnchor)).toBeGreaterThan(sticky);
  });

  it("stays below the sheets and modals that must cover the header", () => {
    expect(layer(MODAL_LAYERS.headerAnchor)).toBeLessThan(layer(MODAL_LAYERS.page));
    expect(layer(MODAL_LAYERS.headerAnchor)).toBeLessThan(layer(MODAL_LAYERS.lists));
  });
});
