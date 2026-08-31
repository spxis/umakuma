import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const GRID = readFileSync(
  join(process.cwd(), "src/app/users/[nickname]/grades/GradeKanjiGrid.tsx"),
  "utf8",
);

/*
 * A row has no spare corner.
 *
 * The stroke-order button was placed absolutely at the right edge of each row
 * and revealed on hover, landing on the JLPT pill it was meant to sit beside.
 * The row reserved padding for it - `pr-9` on the pill cluster - and the pills
 * spread into that space anyway, so reserving room was never going to be the
 * fix. A row's controls have to take part in the layout.
 */
describe("the grade row's controls", () => {
  const rowBody = GRID.slice(GRID.indexOf("const rowBody = ("), GRID.indexOf("const cardBody = ("));

  it("puts the stroke button in the row rather than over it", () => {
    expect(rowBody).toContain("{strokeButton}");
    expect(rowBody).not.toContain("absolute");
    // The reserved gutter goes with it; nothing is being kept clear any more.
    expect(rowBody).not.toContain("pr-9");
  });

  /*
   * The card keeps the floating button. It has a free corner, and one visible
   * control on every card of a screenful is noise rather than help.
   */
  it("leaves the card's button where it was", () => {
    const cardSide = GRID.slice(GRID.indexOf("const cardBody = ("));
    expect(cardSide).toContain("absolute bottom-2 right-2");
  });
});
