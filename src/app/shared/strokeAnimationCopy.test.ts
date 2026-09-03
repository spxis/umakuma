import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  STROKE_ANIMATION_COPY,
  STROKE_SIDE_WIDTH,
  STROKE_SIZES,
  STROKE_SIZE_VALUES,
  STROKE_OUTLINE_STORAGE_KEY,
  STROKE_SIZE_STORAGE_KEY,
} from "./strokeAnimationCopy";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * The numbers are the reason the size control exists: sixteen numerals on a
 * 200px drawing cannot be read, which made the Numbers button useless on the
 * characters that most need it.
 */
describe("the drawing sizes", () => {
  it("offers three, smallest first, so the row reads S M L", () => {
    expect(STROKE_SIZE_VALUES).toEqual(["small", "medium", "large"]);
  });

  it("rises with each step, and large is big enough to read a stroke number on", () => {
    const [small, medium, large] = STROKE_SIZE_VALUES.map((value) => STROKE_SIZES[value]);
    expect(small).toBeLessThan(medium!);
    expect(medium!).toBeLessThan(large!);
    expect(large).toBeGreaterThanOrEqual(300);
  });

  it("names every size for the reader", () => {
    for (const value of STROKE_SIZE_VALUES) {
      expect(STROKE_ANIMATION_COPY.sizes[value].length, value).toBe(1);
      expect(STROKE_ANIMATION_COPY.sizeTitle[value].length, value).toBeGreaterThan(3);
    }
  });

  /*
   * The drawing sits between the printed faces and its controls, and it is
   * centred only while those two are the same width. They were not - 140px of
   * glyph cells against 88px of buttons - and the drawing sat 28px right of
   * centre. One constant, used by both, is what keeps it true.
   */
  it("gives both sides of the drawing the same width, from one constant", () => {
    for (const path of ["src/app/shared/KanjiStrokeAnimation.tsx", "src/app/shared/KanjiDetailModal.tsx"]) {
      expect(read(path), path).toContain("STROKE_SIDE_WIDTH");
    }
    expect(STROKE_SIDE_WIDTH).toMatch(/^sm:w-/);
  });
});

/*
 * The whole character behind one stroke.
 *
 * The animation draws the finished character faintly underneath and drops it
 * as soon as a single stroke is picked, because an outline of everything also
 * makes "not drawn yet" look drawn. The other half of that trade is a first
 * stroke floating in an empty box with nothing to place it against, so it is a
 * mode: off unless asked for, and remembered.
 */
describe("the outline mode", () => {
  it("is named for what it shows, not for the feature", () => {
    expect(STROKE_ANIMATION_COPY.outline).toBe("Outline");
    expect(STROKE_ANIMATION_COPY.outlineTitle).toBe("Show the whole character faintly behind");
  });

  it("remembers itself under its own key, apart from the size", () => {
    expect(STROKE_OUTLINE_STORAGE_KEY).toBe("umakuma:stroke-outline");
    expect(STROKE_OUTLINE_STORAGE_KEY).not.toBe(STROKE_SIZE_STORAGE_KEY);
  });
});
