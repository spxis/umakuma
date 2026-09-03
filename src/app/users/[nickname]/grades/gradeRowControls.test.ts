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
  /*
   * The row is the shared component now, so the button rides in its trailing
   * slot - which sits outside the row button, takes part in the layout, and
   * has nothing to be positioned over.
   */
  const rowBranch = GRID.slice(GRID.indexOf("if (rows) {"), GRID.indexOf("<SubjectCards"));

  it("puts the stroke button in the row rather than over it", () => {
    expect(rowBranch).toContain("renderTrailing");
    expect(rowBranch).toContain("StrokeOrderButton");
    expect(rowBranch).not.toContain("absolute");
    // The reserved gutter goes with it; nothing is being kept clear any more.
    expect(rowBranch).not.toContain("pr-9");
  });

  /*
   * The card keeps the floating button. It has a free corner, and one visible
   * control on every card of a screenful is noise rather than help.
   *
   * The card is the shared grid now, so the corner is that grid's slot rather
   * than a position written here - which is the point of the consolidation:
   * the card decides where its corner is, and every surface gets the same one.
   */
  it("keeps the card's button in the corner slot", () => {
    const cardSide = GRID.slice(GRID.indexOf("<SubjectCards"));
    expect(cardSide).toContain("renderCorner");
    expect(cardSide).toContain("StrokeOrderButton");
    /* Positioned by the shared card, so this file no longer places it. */
    expect(cardSide).not.toContain("absolute bottom-2 right-2");
  });

  /*
   * Choosing borrows the card's click, so the stroke button must not be there
   * to take it - a second control inside a card that is currently a checkbox.
   */
  it("drops the card's button while choosing", () => {
    const cardSide = GRID.slice(GRID.indexOf("<SubjectCards"));
    expect(cardSide).toContain("selection?.choosing");
  });
});
