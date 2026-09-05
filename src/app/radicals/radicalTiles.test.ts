import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { RADICAL_TILE_CLASS } from "@/app/shared/radicalTileClass";

describe("the radical picker is blue", () => {
  const view = readFileSync("src/app/radicals/RadicalBrowserView.tsx", "utf8");

  /* John: "these radicals in our radical builder should be a very light blue.
     and blue when selected... since radicals are blue in our site. now its
     white which is wrong." */
  it("draws a radical in the radical colour, not in white", () => {
    expect(RADICAL_TILE_CLASS.rest).toContain("bg-radical/15");
    expect(RADICAL_TILE_CLASS.rest).not.toContain("bg-surface");
    expect(view).not.toContain("border-line bg-surface text-foreground hover:bg-surface-muted");
  });

  it("fills solid when it is chosen", () => {
    expect(RADICAL_TILE_CLASS.chosen).toContain("bg-radical");
    expect(RADICAL_TILE_CLASS.chosen).toContain("text-white");
    /* The accent is the site's blue for controls; a radical has its own. */
    expect(RADICAL_TILE_CLASS.chosen).not.toContain("accent");
  });

  /* The same weights `typeGlyphBoxClass` uses, so the picker and an explorer
     card cannot end up two different blues. */
  it("uses the shared token at the shared weights", () => {
    const shared = readFileSync(
      "src/app/users/[nickname]/level-explorer/lib/levelExplorerDisplayClasses.ts",
      "utf8",
    );
    expect(shared).toContain("border-radical/50 bg-radical/15 text-radical");
    expect(RADICAL_TILE_CLASS.rest).toContain("border-radical/50");
  });

  /* John: "There shouldn't be any more white boxes." A tile that loses its
     colour when it becomes unpickable stops reading as a radical at exactly
     the moment there are most of them on screen. */
  it("fades a dead end rather than draining its colour", () => {
    expect(RADICAL_TILE_CLASS.deadEnd).toContain("radical");
    expect(RADICAL_TILE_CLASS.deadEnd).toContain("cursor-not-allowed");
    expect(view).toContain("RADICAL_TILE_CLASS.deadEnd");
  });

  it("leaves no white box in either picker", () => {
    const grid = readFileSync("src/app/shared/RadicalPickerGrid.tsx", "utf8");
    for (const source of [view, grid]) {
      expect(source).not.toContain("bg-surface text-foreground hover:bg-surface-muted");
      expect(source).not.toContain("bg-surface-muted text-foreground/60");
    }
    /* Every state of a tile names the radical colour. */
    for (const state of Object.values(RADICAL_TILE_CLASS)) expect(state).toContain("radical");
  });

  /* Both pickers - the browser and the one the search bar opens - draw from
     the one source, so they cannot drift apart again. */
  it("is the one source both pickers read", () => {
    const grid = readFileSync("src/app/shared/RadicalPickerGrid.tsx", "utf8");
    expect(grid).toContain("RADICAL_TILE_CLASS.chosen");
    expect(grid).toContain("RADICAL_TILE_CLASS.rest");
    expect(view).toContain("RADICAL_TILE_CLASS.rest");
  });
});
