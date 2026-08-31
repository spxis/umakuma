import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const HERE = join(process.cwd(), "src/app/users/[nickname]/shared");
const read = (file: string) => readFileSync(join(HERE, file), "utf8");

/*
 * The row and the card are different shapes, and the overlays have to know.
 *
 * Both explorers draw through `UnifiedExplorerCard`. Its card puts the level,
 * the success rate and the trouble/favourite controls in the corners of a
 * glyph box 128 pixels tall; its row's glyph box is 44 pixels square. The same
 * corner pieces went into both, so every row in the JLPT and WaniKani lists was
 * a pile - `L2` over `80%` over the character it was describing.
 */
describe("the two card densities", () => {
  it("keeps the row's glyph box holding nothing but the glyph", () => {
    const source = read("UnifiedExplorerCard.tsx");
    const rowBranch = source.slice(source.indexOf("{rows ? ("), source.indexOf("      ) : ("));

    expect(rowBranch).toContain("data-explorer-glyph-hitbox");
    /*
     * The overlay belongs beside the box in a row, not inside it. Written as a
     * position check rather than a snapshot: what matters is only that the
     * overlay comes after the box closes.
     */
    const boxAt = rowBranch.indexOf("data-explorer-glyph-hitbox");
    const overlayAt = rowBranch.indexOf("{glyphOverlay}");
    expect(overlayAt).toBeGreaterThan(boxAt);
    expect(rowBranch.slice(boxAt, overlayAt)).toContain("{glyphText}");
  });

  /*
   * Both overlays have to ask, or the one that does not keeps positioning
   * itself absolutely and lands back on the glyph.
   */
  it.each(["GlyphMetadataBadges.tsx", "GlyphTagOverlay.tsx"])("%s asks which density it is in", (file) => {
    expect(read(file)).toContain("useIsRowDensity");
  });

  /*
   * The card keeps its corners. A fix that made everything inline everywhere
   * would have taken the badges out of the card layout they were designed for.
   */
  it("still places the card's overlays absolutely", () => {
    expect(read("GlyphMetadataBadges.tsx")).toContain("absolute");
    expect(read("GlyphTagOverlay.tsx")).toContain("absolute");
  });
});
